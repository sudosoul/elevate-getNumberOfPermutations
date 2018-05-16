/**
 * Deferred Lambda Function to Determine the Total # of Permutations
 * for a given number of total prescribed pills.
 *
 * This service is triggered upon INSERTS into the ELEVATE.PERMUTATIONS.DEFERRED DynamoDB table.
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  cacheUrl   - The Cache URL containing previously computed permutations.
 *  deferUrl   - The URL to POST deferred requests to. 
 *
 * @author Rob Mullins <rob.mullins.official@gmail.com>
 */

// Import Dependencies:
const Request = require('request');

// Set Defaults:
const minPillsPerDay = 1;
const maxPillsPerDay = 2;

/**
 * Lambda Entry Point
 * Calculates the total # of permutations for the client specified total number of pills. 
 *
 * @param {object} event            - Data containing the client/caller information, such as querystrings, IP address, etc.
 * @param {object} context          - Object containing runtime information for this Lambda function.
 * @param {LambdaCallback} callback - The callback that handles the Lambda completion.
 *
 * @callback LambdaCallback
 * @param {Error}         error     - Optional error object to indicate Lambda failure. 
 * @param {object|string} success   - Optional JSON.stringify compatible object or string to indicate Lambda success.
 */
exports.handler = async function(event, context, callback) {
  // Ensure Required Environment Variables Set:
  if (!process.env.cacheUrl) return callback('Error: The `cacheUrl` environment variable was not set');
  if (!process.env.deferUrl) return callback('Error: The `deferUrl` environment variable was not set');

  //** Async Iterate through DynamoDB Events **//
  const processed = await Promise.all(event.Records.map(async (record) => {  // This allows us to perform the below code in parallel for each iteration of Records, while waiting for each async iteration to complete before the Lambda automatically exits (due to event loop being empty).
    // Only process INSERT events on the Dynamo Table, since new jobs are INSERT events, while updates to existing jobs are MODIFY events...
    if (record.eventName === 'INSERT') {
      // Async Update the task status to 'IN_PROGRESS':
      try {
        const updateTaskStatus = await updateTask(record.dynamodb.Keys.id.S, 'IN_PROGRESS');
      } catch (e) {
        console.log(e);
      }
      
      // Calculate the Permutations (NOTE: This is an event blocking operation):
      const numberOfPermutations = getNumberOfPermutations(record.dynamodb.NewImage.pills.N, 0);
      
      // Async Update the task status to 'COMPLETE' & insert the calculated permutations:
      try {
        const completeTask = await updateTask(record.dynamodb.Keys.id.S, 'COMPLETE', numberOfPermutations);
      } catch (e) {
        console.log(e);
      }
      
      // Async Save the calculated permutations to cache:
      try {
        const cached = await saveToCache(record.dynamodb.NewImage.pills.N, numberOfPermutations);
      } catch (e) {
        console.log(e);
      }
    }
  }));

  // All processing finished, end this Lambda execution with a success status:
  if (processed) return callback(null); 
  
  /**
   * Recursively calculates the total number of permutations for a given `numberOfPills` value.    
   *
   * @param    {int} numberOfPills - The number of pills to calculate permutations for.
   * @return   {int}               - The total number of permutations. 
   */
  function getNumberOfPermutations(numberOfPills) {
    let numberOfPermutations = 0;
    function findPermutations(sum) {
      if (sum > numberOfPills)   return false;
      if (sum === numberOfPills) return numberOfPermutations++;
      for (let i = minPillsPerDay; i <= maxPillsPerDay; i++) { 
        findPermutations(sum+i);
      }
    }
    findPermutations(0);
    return numberOfPermutations;
  }

  /**
   * Saves the number of permutations for the given number of pills in the cache.
   *
   * @param    {int} numberOfPills        - The total number of pills, also the cache key
   * @param    {int} numberOfPermutations - The total number of permutations for the total pills, also the cache value.
   * @return   {Promise.<bool,string>}                     
   * @resolves {bool}                     - True on successful save. 
   * @rejects  {string}                   - An error message if the request failed.
   */
  async function saveToCache(numberOfPills, numberOfPermutations) {
    return new Promise((resolve, reject) => {
      Request({
        url     : process.env.cacheUrl,
        method  : 'POST',
        body    : {pills: numberOfPills.toString(), permutations: numberOfPermutations.toString()}, // Even though these values are defined as Numbers in Dynamo, we have to pass them as a string in the request body for the API GW -> Dynamo proxy mapping to work.
        json    : true
      }, (err, res, body) => {
        if (err) return reject('Error: Internal Error Making POST Request to Cache Service - ' +err);
        if (res.statusCode !== 200) return reject('Error: POST Request to Cache Service failed - ' +res);
        return resolve(true);
      });
    });
  }

  /**
   * Updates the task in the deferred tasks table. 
   *
   * @param    {string} id             - The unique task ID.
   * @param    {string} status         - The task status.
   * @param    {int}    permutations   - The calculated permutations, or null if job still in progress. 
   * @return   {Promise.<bool,string>}                     
   * @resolves {bool}                  - True on successful save. 
   * @rejects  {string}                - An error message if the request failed.
   */
  async function updateTask(id, status, permutations) {
    return new Promise((resolve, reject) => {
      Request({
        url     : process.env.deferUrl +'/' +id,
        method  : 'PUT',
        body    : {status: status, permutations: permutations ? permutations.toString() : '0'},
        json    : true
      }, (err, res, body) => {
        if (err) return reject('Error: Internal Error Making POST Request to Defer Service - ' +err);
        if (res.statusCode !== 200) return reject('Error: POST Request to Defer Service Failed - ' +res);
        return resolve(true); 
      });
    });
  }

};
