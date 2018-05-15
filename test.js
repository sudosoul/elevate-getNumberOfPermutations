const numberOfPills = 48;
let minPillsPerDay = 1;
let maxPillsPerDay = 2;


  /**
   * Recursively calculates the total number of permutations for a given `numberOfPills` value.    
   *
   * @param    {int} numberOfPills - The number of pills to calculate permutations for.
   * @param    {int} sum           - The recursively determined sum, incremented until it equals the `numberOfPills`.
   * @return   VOID                - Increments a global value `numberOfPermutations`.
   */
  function getNumberOfPermutations(numberOfPills, sum) {
    if (sum > numberOfPills)   return false;
    if (sum === numberOfPills) return numberOfPermutations++;
    for (let i = minPillsPerDay; i <= maxPillsPerDay; i++) { 
      getNumberOfPermutations(numberOfPills, sum+i);
    }
  }


let numberOfPermutations = 0;
console.time('getNumberOfPermutations');
getNumberOfPermutations(numberOfPills, 0);
console.timeEnd('getNumberOfPermutations');
console.log('Total number of ways to take pills = ', numberOfPermutations);

