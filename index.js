require('dotenv').config();

const express = require('express');
const axios = require('axios');
const fs = require('fs/promises'); // Usamos la versión de promesas para código más limpio

const app = express();
const port = 7000;

const { API_URL, OCTOPUS_EMAIL, OCTOPUS_PASSWORD, OCTOPUS_PROPERTY_ID } = process.env;

const ALL_CONFIG_EXISTS = API_URL && OCTOPUS_EMAIL && OCTOPUS_PASSWORD && OCTOPUS_PROPERTY_ID
if (!ALL_CONFIG_EXISTS) {
    console.error('Ensure all env var are available. Check .env.sample file')
    process.exit(1)
}


async function getToken() {
    console.log('Fetching token');
    const AUTH_MUTATION = `
        mutation obtainKrakenToken($input: ObtainJSONWebTokenInput!) {
          obtainKrakenToken(input: $input) {
            token
          }
        }
    `;

    try {
        const response = await axios.post(API_URL, {
            query: AUTH_MUTATION,
            variables: {
                input: {
                    email: OCTOPUS_EMAIL,
                    password: OCTOPUS_PASSWORD,
                },
            },
        });

        if (response.data.errors) {
            throw new Error(`FETCH_TOKEN_ERROR: ${response.data.errors[0].message}`);
        }
        
        const token = response.data.data.obtainKrakenToken.token;
        console.log('Token obtenido con éxito.');
        return token;
    } catch (error) {
        console.error('Error al obtener el token:', error.message);
        throw error; // Relanzamos el error para que el endpoint lo capture
    }
}

/**
 * Obtiene los datos de consumo diario para un rango de fechas.
 * @param {string} token - El token JWT para la autorización.
 * @param {Date} startDate - La fecha de inicio del periodo.
 * @param {Date} endDate - La fecha de fin del periodo.
 * @returns {Promise<object>} Los datos de consumo.
 */
async function getDailyConsumption(token, startDate, endDate) {
    console.log(`Solicitando consumo desde ${startDate.toISOString()} hasta ${endDate.toISOString()}`);
    
    // AQUÍ ESTÁ LA CORRECCIÓN: Se añade "... on IntervalMeasurementType"
    const GET_CONSUMPTION_QUERY = `
        query getAccountMeasurements(
            $propertyId: ID!, $first: Int!, $startAt: DateTime!, $endAt: DateTime!, $timezone: String, $utilityFilters: [UtilityFiltersInput!]
        ) {
            property(id: $propertyId) {
                measurements(first: $first, startAt: $startAt, endAt: $endAt, timezone: $timezone, utilityFilters: $utilityFilters) {
                    edges {
                        node {
                            value
                            unit
                            ... on IntervalMeasurementType {
                                startAt
                                endAt
                            }
                        }
                    }
                }
            }
        }
    `;

    const variables = {
        propertyId: OCTOPUS_PROPERTY_ID,
        first: 31,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        timezone: "Atlantic/Canary",
        utilityFilters: [{
            electricityFilters: {
                readingFrequencyType: "DAY_INTERVAL",
                readingDirection: "CONSUMPTION"
            }
        }]
    };

    try {
        const response = await axios.post(
            API_URL,
            {
                query: GET_CONSUMPTION_QUERY,
                variables: variables,
            },
            {
                headers: {
                    'Authorization': `JWT ${token}`
                }
            }
        );

        if (response.data.errors) {
            // Se mejora el mensaje de error para dar más detalles si vuelve a ocurrir
            const errorMessage = response.data.errors.map(e => e.message).join(', ');
            throw new Error(`Error en la API al obtener consumo: ${errorMessage}`);
        }
        
        console.log('Datos de consumo obtenidos con éxito.');
        // Se ajusta la ruta para acceder a los datos, ya que pueden venir en un array vacío
        return response.data.data.property.measurements.edges || [];
    } catch (error) {
        console.error('Error al obtener los datos de consumo:', error.message);
        throw error;
    }
}

/**
 * =================================================================
 * ENDPOINTS DEL SERVIDOR WEB
 * =================================================================
 */

/**
 * Endpoint para extraer los datos del mes actual y guardarlos en un fichero.
 * Diseñado para ser llamado por un cron job.
 */
app.get('/extraer', async (req, res) => {
    try {
        console.log('--- Proceso de extracción iniciado ---');

        const { ano, mes } = req.query;
        let year, month_0_indexed; // El mes en JS va de 0 a 11

        // 1. Determinar el mes y año a procesar
        if (ano && mes) {
            // Si se especifican parámetros, úsalos
            year = parseInt(ano);
            month_0_indexed = parseInt(mes) - 1; // Convertimos el mes (1-12) al formato de JS (0-11)
            console.log(`Parámetros recibidos: Procesando mes ${mes} del año ${year}`);
        } else {
            // Si no hay parámetros, usa la fecha actual
            const now = new Date();
            year = now.getFullYear();
            month_0_indexed = now.getMonth();
            console.log(`Sin parámetros: Procesando mes actual (${month_0_indexed + 1}/${year})`);
        }
        
        // Validar que los valores sean correctos
        if (isNaN(year) || isNaN(month_0_indexed) || month_0_indexed < 0 || month_0_indexed > 11) {
            return res.status(400).send({ error: "El año o el mes proporcionados no son válidos." });
        }

       // 2. Calcular las fechas de inicio y fin para la API (en UTC)
        const startDate = new Date(Date.UTC(year, month_0_indexed, 1));
        const endDate = new Date(Date.UTC(year, month_0_indexed + 1, 1));

        // 2. Autenticar y obtener datos
        const token = await getToken();
        const consumptionData = await getDailyConsumption(token, startDate, endDate);

        // 4. Preparar los datos y guardarlos
        const monthString = (month_0_indexed + 1).toString().padStart(2, '0');
        const fileName = `consumo-${year}-${monthString}.json`;
        
        // Simplificamos la estructura de datos para que sea más fácil de usar
        const simplifiedData = consumptionData.map(edge => ({
            fecha: edge.node.startAt.split('T')[0], // Solo la fecha
            consumo_kwh: parseFloat(edge.node.value),
        }));

        await fs.writeFile(fileName, JSON.stringify(simplifiedData, null, 2), 'utf-8');

        console.log(`Datos guardados correctamente en ${fileName}`);
        res.status(200).send({
            mensaje: `Datos extraídos y guardados con éxito para ${year}-${monthString}`,
            fichero: fileName,
            registros: simplifiedData.length,
        });
        
    } catch (error) {
        console.error('--- Fallo en el proceso de extracción ---', error);
        res.status(500).send({ error: 'No se pudieron extraer los datos.', details: error.message });
    }
});

/**
 * Endpoint para leer los datos de consumo de un mes específico desde un fichero guardado.
 * Ejemplo de uso: /consumo?ano=2025&mes=07
 */
app.get('/consumo', async (req, res) => {
    const { ano, mes } = req.query;

    if (!ano || !mes) {
        return res.status(400).send({ error: 'Los parámetros "ano" y "mes" son obligatorios.' });
    }

    const fileName = `consumo-${ano}-${mes.padStart(2, '0')}.json`;

    try {
        const data = await fs.readFile(fileName, 'utf-8');
        res.status(200).json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') { // ENOENT significa "Error, No such file or directory"
            res.status(404).send({ error: `No se encontraron datos para ${ano}-${mes}. Ejecuta primero el endpoint /extraer para ese mes.` });
        } else {
            res.status(500).send({ error: 'Error al leer el fichero de datos.' });
        }
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
    console.log('Endpoints disponibles:');
    console.log(`  - GET /extraer (extrae los datos del mes actual)`);
    console.log(`  - GET /consumo?ano=AAAA&mes=MM (devuelve los datos de un mes)`);
});