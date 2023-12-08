
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import fetch from 'node-fetch'

/**
 * verrifies the accesstoken with jwt verification
 * @param bearerToken accepts access token 
 */
export const verifyToken = async (bearerToken: string) => {
    const client = jwksClient({
      jwksUri: `${process.env.AUTH0_DOMAIN}.well-known/jwks.json`,
    });
  
    function getJwksClientKey(header: any, callback: any) {
      client.getSigningKey(header.kid, function (error, key) {
        let keyNew : jwksClient.SigningKey & jwksClient.CertSigningKey & jwksClient.RsaSigningKey = key as jwksClient.SigningKey & jwksClient.CertSigningKey & jwksClient.RsaSigningKey;
        const signingKey = keyNew.publicKey || keyNew.rsaPublicKey;
        callback(null, signingKey);
      });
    }
  
    return new Promise((resolve, reject) => {
      jwt.verify(
        bearerToken,
        getJwksClientKey,
        {
          audience: process.env.AUTH0_AUDIENCE,
          issuer: process.env.AUTH0_DOMAIN,
          algorithms: ["RS256"],
        },
        function (err, decoded) {
          if (err) reject(err);
          resolve(decoded);
        }
      );
    });
  };

  /**
   * gets the auth0 user info from aud url and access token
   * @param url  aud url
   * @param token access token
   */
  export const getUserInfo = async (url:string, token:string) => {
    return fetch(url, {headers:{Authorization: `Bearer ${token}`}}).then((r:any)=>r.json())
  }