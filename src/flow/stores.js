import { writable } from 'svelte/store';

export const user = writable(null);
export const profile = writable(null);
export const transactionStatus = writable(null);
export const transactionInProgress = writable(false);

//floats
export const setupAccountInProgress = writable(false);
export const setupAccountStatus = writable(false);

export const draftFloat = writable({
    name: '',
    description: '',
    url: '',
    ipfsHash: '',
    claimable: true,
    timelock: false,
    startTime: false,
    endTime: false,
    quantity: 2,    
    claimCodeEnabled: false,
    claimCode: '',
    transferrable: true,
    multipleSecretsEnabled: false,
    initialGroup: "",
    flowTokenPurchase: false,
  });

  export const eventCreationInProgress = writable(false);
export const eventCreatedStatus = writable(false);


export const floatClaimingInProgress = writable(false);
export const floatClaimedStatus = writable(false);

export const txId = writable(null);


