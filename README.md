# gatsby-source-cloudbase-cms

Source plugin for pulling documents into Gatsby from a [Tencent CloudBase CMS RESTful API](https://docs.cloudbase.net/cms/usage/restful/intro).

## Installing the plugin

```sh
# Using Yarn
yarn add gatsby-source-cloudbase-cms

# Or using NPM
npm install --save gatsby-source-cloudbase-cms
```

## Basic usage

You can enable and configure this plugin in your `gatsby-config.js` file.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-cloudbase-cms`,
    options: {
      apiURL: `https://xxx.ap-xxx.service.tcloudbase.com/api/v1.0`,
      // apiToken: `xxxxxxxx`,
      queryLimit: 1000, // Defaults to 100
      collectionTypes: [`product`, `user`],
      singleTypes: [`global`, `contact`],
      // fetchOptions: { // axios options
      //   proxy: { host: `127.0.0.1`, port: 8899 },
      // },
    },
  },
];
```

## Querying data

You can query Document nodes created from your CloudBase CMS RESTful API like the following:

### Query single type info

```graphql
{
  cloudBaseGlobal {
    siteName
    favicon {
      localFile {
        publicURL
      }
    }
  }
}
```

### Querying collection type list

```graphql
{
  allCloudBaseProduct {
    edges {
      node {
        id
        title
        description
      }
    }
  }
}
```

### Querying collection type info

```graphql
{
  cloudBaseProduct(slug: { eq: $slug }) {
    id
    title
    description
    price
    image {
      localFile {
        publicURL
        childImageSharp {
          gatsbyImageData(
            layout: FULL_WIDTH
            placeholder: BLURRED
            aspectRatio: 1.3
          )
        }
      }
    }
  }
}
```