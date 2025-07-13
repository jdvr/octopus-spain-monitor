const axios = require('axios');

const AUTH_MUTATION = `
        mutation obtainKrakenToken($input: ObtainJSONWebTokenInput!) {
          obtainKrakenToken(input: $input) {
            token
          }
        }
    `;

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

const TIMEZONE = 'Atlantic/Canary';
const ELECTRICITY_FILTER = {
  electricityFilters: {
    readingFrequencyType: 'DAY_INTERVAL',
    readingDirection: 'CONSUMPTION',
  },
};

function createApi({ apiUrl, email, password, propertyId }) {
  const getToken = async () => {
    try {
      const response = await axios.post(apiUrl, {
        query: AUTH_MUTATION,
        variables: {
          input: {
            email,
            password,
          },
        },
      });

      if (response.data.errors) {
        throw new Error(
          `FETCH_TOKEN_FAILED: ${response.data.errors[0].message}`,
        );
      }

      return response.data.data.obtainKrakenToken.token;
    } catch (error) {
      console.error('Error al obtener el token:', error.message);
      throw error; // Relanzamos el error para que el endpoint lo capture
    }
  };

  const getDailyConsumption = async (startDate, endDate) => {
    const token = await getToken();

    const variables = {
      propertyId,
      first: 31,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      timezone: TIMEZONE,
      utilityFilters: [ELECTRICITY_FILTER],
    };

    try {
      const response = await axios.post(
        apiUrl,
        {
          query: GET_CONSUMPTION_QUERY,
          variables: variables,
        },
        {
          headers: {
            Authorization: `JWT ${token}`,
          },
        },
      );

      if (response.data.errors) {
        const errorMessage = response.data.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(`FAILED_TO_FETCH_DATA: ${errorMessage}`);
      }

      return response.data.data.property.measurements.edges || [];
    } catch (error) {
      throw new Error('FAILED_TO_FETCH_DATA', { cause: error });
    }
  };

  return {
    getDailyConsumption,
  };
}

module.exports = createApi;
