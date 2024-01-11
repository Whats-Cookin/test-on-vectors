import {
    createRequestBody,
    createVerifyRequestBody
  } from '../mock.data.js';
import {
  shouldBeIssuedVc
} from '../assertions.js'
// import {createTimeStamp, proveVP} from './data-generator.js';
import assert from 'node:assert/strict';
import {createRequire} from 'module';
import {filterByTag} from 'vc-api-test-suite-implementations';
import http from 'http';
import {randomFillSync} from 'node:crypto';
import receiveJson from '../receive-json.js';

const require = createRequire(import.meta.url);
const baseContextUrl = 'https://www.w3.org/ns/credentials/v2';

const vcApiTag = 'vc2.0';
const {match} = filterByTag({tags: [vcApiTag]});

const fs = require('fs');
const path = require('path');
  
  describe('Verifiable Credentials Data Model v2.0', function() {
    const summaries = new Set();
    this.summary = summaries;
    const reportData = [];
    // this will tell the report
    // to make an interop matrix with this suite
    this.matrix = true;
    this.report = true;
    this.implemented = [...match.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Issuer';
    // the reportData will be displayed under the test title
    this.reportData = reportData;
    for(const [name, implementation] of match) {
      const issuer = implementation.issuers.find(
        issuer => issuer.tags.has(vcApiTag));
      const verifier = implementation.verifiers.find(
        verifier => verifier.tags.has(vcApiTag));
      const vpVerifier = implementation.vpVerifiers.find(
        vpVerifier => vpVerifier.tags.has(vcApiTag));
      function it2(title, fn) {
        it(title, async function() {
          this.test.cell = {
            columnId: name,
            rowId: this.test.title
          };
          await fn.apply(this, arguments);
        });
      }
  
      async function post(endpoint, object) {
        const url = endpoint.settings.endpoint;
        if(url.startsWith('https:')) {
          // Use vc-api-test-suite-implementations for HTTPS requests.
          const {data, error} = await endpoint.post({json: object});
          if(error) {
            throw error;
          }
          return data;
        }
        const postData = Buffer.from(JSON.stringify(object));
        const res = await new Promise((resolve, reject) => {
          const req = http.request(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': postData.length,
              Accept: 'application/json'
            }
          }, resolve);
          req.on('error', reject);
          req.end(postData);
        });
        const result = await receiveJson(res);
        if(res.statusCode >= 400) {
          if(result != null && result.errors) {
            throw new Error(result.errors);
          }
          throw new Error(result);
        }
        if(res.statusCode >= 300) {
          throw new Error('Redirect not supported');
        }
        return result;
      }
  
      async function issue(credential) {
        const issueBody = createRequestBody({issuer, vc: credential});
        return post(issuer, issueBody);
      }
  
      async function verify(vc) {
        const verifyBody = createVerifyRequestBody({vc});
        const result = await post(verifier, verifyBody);
        if(result?.errors?.length) {
          throw result.errors[0];
        }
        return result;
      }
  
      async function verifyVp(vp, options = {checks: []}) {
        const body = {
          verifiablePresentation: vp,
          options
        };
        const result = await post(vpVerifier, body);
        if(result?.errors?.length) {
          throw result.errors[0];
        }
        return result;
      }
  
      describe(name, function() {
  
          const credentialFolderPath = '/Users/kene/Documents/codes/python/cooperationorg/trust-claim/vc-python-test/vc-data-model-2.0-test-suite/tests/t3-test/inputs';
          const credentialFiles = fs.readdirSync(credentialFolderPath);
          const credentialJsonFiles = credentialFiles.filter(file => file.endsWith('.json'));
          
          credentialJsonFiles.forEach(async fileName => {
            const filePath = path.join(credentialFolderPath, fileName);
            it2(`Verifing Credential - ${fileName}  using verify function`, async function () {
              await assert.rejects(verify(require(filePath)));
            });
            await console.log(shouldBeIssuedVc(require(filePath)));
          });
         
    });
}
});