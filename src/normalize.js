import { has, isObject } from 'lodash/fp';
import { createRemoteFileNode } from 'gatsby-source-filesystem';

const isImage = (item) => item?.match?.(/^(http?s|cloud):\/\/.*\.(jpeg|jpg|gif|png)$/i) != null;

const cloudIdToUrl = (cloudId) => {
  if (!cloudId) {
    return ''
  }

  // 非 cloudId
  if (!/^cloud:\/\//.test(cloudId)) {
    return cloudId
  }

  // cloudId: cloud://cms-demo.636d-cms-demo-1252710547/cloudbase-cms/upload/2020-09-15/Psa3R3NA4rubCd_R-favicon.png
  let link = cloudId.replace('cloud://', '')
  // 文件路径
  const index = link.indexOf('/')
  // envId.bucket
  const prefix = link.slice(0, index)
  // [envId, bucket]
  const splitPrefix = prefix.split('.')

  // path 路径
  const path = link.slice(index + 1)

  let envId
  let trimBucket
  if (splitPrefix.length === 1) {
    trimBucket = splitPrefix[0]
  } else if (splitPrefix.length === 2) {
    envId = splitPrefix[0]
    trimBucket = splitPrefix[1]
  }

  if (envId) {
    envId = envId.trim()
  }

  return `https://${trimBucket}.tcb.qcloud.la/${path}`
}

const extractImage = async (image, ctx) => {
  const { store, cache, createNode, createNodeId, auth } = ctx;
  const url = cloudIdToUrl(image);

  const fileNode = await createRemoteFileNode({
    url,
    store,
    cache,
    createNode,
    createNodeId,
    auth,
  });

  if (fileNode) {
    return { url, localFile___NODE: fileNode.id };
  }
  return { url };
};

const extractFields = async (item, ctx, parent, key) => {
  if (isImage(item)) {
    parent[key] = await extractImage(item, ctx);
  }

  if (Array.isArray(item)) {
    for (const [index, element] of item.entries()) {
      await extractFields(element, ctx, item, index);
    }
    return;
  }

  if (isObject(item)) {
    for (const key in item) {
      await extractFields(item[key], ctx, item, key);
    }
    return;
  }
};

exports.isDynamicZone = (node) => {
  // Dynamic zones are always arrays
  if (Array.isArray(node)) {
    return node.some((nodeItem) => {
      // The object is a dynamic zone if it has a cloudbase_component key
      return has('cloudbase_component', nodeItem);
    });
  }
  return false;
};

// Downloads media from image type fields
exports.downloadMediaFiles = async (entities, ctx) => {
  return Promise.all(entities.map((entity, index) => extractFields(entity, ctx, entities, index)));
};
