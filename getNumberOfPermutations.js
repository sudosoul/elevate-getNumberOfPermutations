// if numberOfPills > 43 -- defer request
const totalPills  = 43;
const minPillsPerDay = 1;
const maxPillsPerDay = 2;


function getNumberOfPermutations(totalPills, sum) {
  if (sum > totalPills)   return false;
  if (sum === totalPills) return numberOfPermutations++;
  for (let i = minPillsPerDay; i <= maxPillsPerDay; i++) { 
    getNumberOfPermutations(totalPills, sum+i);
  }
}

let numberOfPermutations = 0;
console.time('getNumberOfPermutations');
getNumberOfPermutations(totalPills, 0);
console.timeEnd('getNumberOfPermutations');
console.log('Total number of ways to take pills = ', numberOfPermutations);




