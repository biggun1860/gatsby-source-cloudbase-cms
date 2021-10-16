import axios from 'axios';
import { isObject, forEach, set, castArray, startsWith } from 'lodash';

module.exports = async (entityDefinition, ctx) => {
  const { apiURL, apiToken, fetchOptions, queryLimit, reporter } = ctx;

  const { endpoint, api } = entityDefinition;

  // Define API endpoint.
  const apiBase = `${apiURL}/${endpoint}`;

  const requestOptions = {
    method: 'GET',
    url: apiBase,
    // Place global params first, so that they can be overriden by api.qs
    params: { limit: queryLimit, ...api?.qs },
    headers: addAuthorizationHeader({}, apiToken),
    ...fetchOptions,
  };

  reporter.info(
    `Starting to fetch data from CloudBase - ${apiBase} with params ${JSON.stringify(
      requestOptions.params
    )}`
  );

  try {
    const { data } = await axios(requestOptions);
    return castArray(data.data).map(clean);
  } catch (error) {
    reporter.panic(`Failed to fetch data from CloudBase`, error);
  }
};

/**
 * Remove fields starting with `_` symbol.
 *
 * @param {object} item - Entry needing clean
 * @returns {object} output - Object cleaned
 */
const clean = (item) => {
  forEach(item, (value, key) => {
    if (key === `__v`) {
      // Remove mongo's __v
      delete item[key];
    } else if (key === `_id`) {
      // Rename "_id" key to "id".
      delete item[key];
      item.id = value;
    } else if (key === `_createTime`) {
      // Rename "_createTime" key to "createdAt".
      delete item[key];
      item.createdAt = value;
    } else if (key === `_updateTime`) {
      // Rename "_updateTime" key to "updatedAt".
      delete item[key];
      item.updatedAt = value;
    } else if (startsWith(key, '__')) {
      // Gatsby reserves double-underscore prefixes – replace prefix with "cloudBase"
      delete item[key];
      item[`cloudbase_${key.slice(2)}`] = value;
    } else if (isObject(value)) {
      item[key] = clean(value);
    }
  });

  return item;
};

const addAuthorizationHeader = (options, token) => {
  if (token) {
    set(options, 'Authorization', `Bearer ${token}`);
  }

  return options;
};
