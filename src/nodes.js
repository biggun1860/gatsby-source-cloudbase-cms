import createNodeHelpers from 'gatsby-node-helpers';

const { createNodeFactory } = createNodeHelpers({
  typePrefix: 'CloudBase',
});

export const Node = (type, node) =>
  createNodeFactory(type, (node) => {
    node.id = `${type}_${node.cloudBaseId}`;
    return node;
  })(node);
