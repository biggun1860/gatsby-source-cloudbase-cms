import _, { upperFirst, camelCase, capitalize } from 'lodash';

import fetchData from './fetch';
import { Node } from './nodes';
import normalize from './normalize';

const toTypeInfo = (type) => {
  if (typeof type === 'object') {
    return {
      endpoint: type.endpoint || type.name,
      name: type.name,
      api: type.api,
    };
  }

  return { endpoint: type, name: type };
};

const contentTypeToTypeInfo = toTypeInfo;
const singleTypeToTypeInfo = (singleType) => toTypeInfo(singleType, { single: true });

const fetchEntities = async (entityDefinition, ctx) => {
  const entities = await fetchData(entityDefinition, ctx);
  await normalize.downloadMediaFiles(entities, ctx);
  console.log('entities:',entities)

  return entities;
};

const addDynamicZoneFieldsToSchema = ({ type, items, actions, schema }) => {
  const { createTypes } = actions;
  // Search for dynamic zones in all items
  const dynamicZoneFields = {};

  items.forEach((item) => {
    _.forEach(item, (value, field) => {
      if (normalize.isDynamicZone(value)) {
        dynamicZoneFields[field] = 'JSON';
      }
    });
  });

  // Cast dynamic zone fields to JSON
  if (!_.isEmpty(dynamicZoneFields)) {
    const typeDef = schema.buildObjectType({
      name: `CloudBase${upperFirst(camelCase(type))}`,
      fields: dynamicZoneFields,
      interfaces: ['Node'],
    });

    createTypes([typeDef]);
  }
};

exports.sourceNodes = async (
  { store, actions, cache, reporter, getNode, getNodes, createNodeId, createContentDigest, schema },
  { apiURL, apiToken, queryLimit = 100, ...options }
) => {
  const { createNode, deleteNode, touchNode } = actions;

  const ctx = {
    store,
    cache,
    getNode,
    createNode,
    createNodeId,
    queryLimit,
    apiURL,
    apiToken,
    reporter,
    touchNode,
    createContentDigest,
    schema,
  };

  // Start activity, CloudBase CMS data fetching
  const fetchActivity = reporter.activityTimer(`Fetched CloudBase CMS Data`);
  fetchActivity.start();

  const collectionTypes = (options.collectionTypes || []).map(contentTypeToTypeInfo);
  const singleTypes = (options.singleTypes || []).map(singleTypeToTypeInfo);

  const types = [...collectionTypes, ...singleTypes];

  // Execute the promises
  const entities = await Promise.all(types.map((type) => fetchEntities(type, ctx)));

  // new created nodes
  const newNodes = [];

  // Fetch existing cloudbase nodes
  const existingNodes = getNodes().filter((n) => n.internal.owner === `gatsby-source-cloudbase-cms`);

  // Touch each one of them
  existingNodes.forEach((node) => touchNode(node));

  // Merge single and collection types and retrieve create nodes
  types.forEach(({ name }, i) => {
    const items = entities[i];

    addDynamicZoneFieldsToSchema({ type: name, items, actions, schema });

    items.forEach((item) => {
      const node = Node(capitalize(name), item);
      // Adding new created nodes in an Array
      newNodes.push(node);

      // Create nodes
      createNode(node);
    });
  });

  // Make a diff array between existing nodes and new ones
  const diff = existingNodes.filter((existingNode) => {
    return !newNodes.some((newNode) => newNode.id === existingNode.id);
  });

  // Delete diff nodes
  diff.forEach((node) => deleteNode(getNode(node.id)));

  fetchActivity.end();
};
