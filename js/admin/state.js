// Shared state across admin views
export let currentCancerType = null;
export let currentAssignments = [];
export let questionBank = new Map();
export let allCancerTypes = [];
export let isNewCancerType = false;
export let currentUser = null;

export function setCurrentCancerType(val) { currentCancerType = val; }
export function setCurrentAssignments(val) { currentAssignments = val; }
export function setIsNewCancerType(val) { isNewCancerType = val; }
export function setCurrentUser(val) { currentUser = val; }
export function setAllCancerTypes(val) { allCancerTypes = val; }
export function clearQuestionBank() { questionBank.clear(); }
