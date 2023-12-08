# intro
 - React native chat app, group chat made with RN, type-script and apollo-graphql client in frontend for caching and gql operations
 - It uses apollo-server express backend for api resolvers, with Prisma orm connected to planet-scale db

https://github.com/siddheshR12/chat-rn-gql-prisma/assets/39961439/8a648398-7f05-4e3d-85a6-080f734c6e46

# Auth0 
 setup and links
 - frontend auth setup
    https://auth0.com/docs/quickstart/native/react-native  // setting up auth0 for react native app

 - for google signin
   > https://console.developers.google.com/apis/credentials  // create google credentials
   > you will need 'Client ID' & 'Client Secret' and add it in auth0
 - backend token and user verification  // jwt verification

# backend nodejs express ts
 - nodemon, express, bodyparser, cors, http
 - ts-node typescript
 - for node ts and express setup have used above packages, "npm init --yes" without "npm pkg set type="module" worked for me, type="module" caused some problems
 - ts-node and typescript dev dependencies without module seem to work fine for me

# Planetscale and prisma
 you can follow the following links to setup prisma with planetscale
 > https://planetscale.com/docs/prisma/prisma-quickstart // blog or doc link
 > https://www.youtube.com/playlist?list=PLlRapu2ErjJ9DGsGHRwhRlm1FJVSN3FK7 // youtube video tutorial playlist

 once setup is done use following commands:
 > pscale connect <your planetscale db name> // connect to planetscale db
 > npx prisma db push  // push changes in prisma schema/ migrations to your planetscale db
 > npx prisma studio --port <any port thats not in user>  // opens prisma studio to access your db in browser, --port command is optional


# Apolo Graphql client and server 
 > Backend
 - @apollo/server graphql
 - @graphql-tools/schema, graphql-subscriptions, graphql-ws, ws, graphql-tag

 > Frontend
 - @apollo/client, graphql, graphql-ws
 - ws is for websockets/ subscriptions

 > uses apollo client caching features like writeQuery, writeFragment, optimistic update etc. to make sure messages and conversations are cached, not much strain is put on the api 

# aws amplify storage
 setup and links
 > https://docs.amplify.aws/react-native/start/getting-started/installation/    // setup aws amplify in frontend root directory
 > which should generate amplify folder in frontend root directory and also adds aws-exports.js and amplifyconfiguration.json files
 > once setup, add storage, by using `amplify add storage` setup storage properties and name and then `amplify push`
 > install `aws-amplify` library
 > I have made my storage bucket public since this is just an example but for a production app you will need to make it private and add proper polices
 > https://awspolicygen.s3.amazonaws.com/policygen.html  // you can generate your policy for your s3 bucket here

