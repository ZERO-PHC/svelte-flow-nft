import { browser } from "$app/env";
import { get } from "svelte/store";

import * as fcl from "@onflow/fcl";
import "./config";
import {
  user,
  profile,
  transactionStatus,
  transactionInProgress,
  setupAccountInProgress,
  setupAccountStatus,
  eventCreationInProgress,
  eventCreatedStatus,
  floatClaimedStatus,
  floatClaimingInProgress,
  txId
} from "./stores";
import { flowTokenIdentifier } from "./config.js";

import { respondWithError, respondWithSuccess } from "$lib/response";
import { parseErrorMessageFromFCL } from "./utils.js";

export const setupAccount = async () => {
  // setupAccountInProgress.set(true);

  let transactionId = false;
  initTransactionState();

  try {
    transactionId = await fcl.mutate({
      cadence: `
        import FLOAT from 0xFLOAT
        import NonFungibleToken from 0xCORE
        import MetadataViews from 0xCORE
        import GrantedAccountAccess from 0xFLOAT
  
        transaction {
  
          prepare(acct: AuthAccount) {
            // SETUP COLLECTION
            if acct.borrow<&FLOAT.Collection>(from: FLOAT.FLOATCollectionStoragePath) == nil {
                acct.save(<- FLOAT.createEmptyCollection(), to: FLOAT.FLOATCollectionStoragePath)
                acct.link<&FLOAT.Collection{NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection, FLOAT.CollectionPublic}>
                        (FLOAT.FLOATCollectionPublicPath, target: FLOAT.FLOATCollectionStoragePath)
            }
  
            // SETUP FLOATEVENTS
            if acct.borrow<&FLOAT.FLOATEvents>(from: FLOAT.FLOATEventsStoragePath) == nil {
              acct.save(<- FLOAT.createEmptyFLOATEventCollection(), to: FLOAT.FLOATEventsStoragePath)
              acct.link<&FLOAT.FLOATEvents{FLOAT.FLOATEventsPublic, MetadataViews.ResolverCollection}>
                        (FLOAT.FLOATEventsPublicPath, target: FLOAT.FLOATEventsStoragePath)
            }
  
            // SETUP SHARED MINTING
            if acct.borrow<&GrantedAccountAccess.Info>(from: GrantedAccountAccess.InfoStoragePath) == nil {
                acct.save(<- GrantedAccountAccess.createInfo(), to: GrantedAccountAccess.InfoStoragePath)
                acct.link<&GrantedAccountAccess.Info{GrantedAccountAccess.InfoPublic}>
                        (GrantedAccountAccess.InfoPublicPath, target: GrantedAccountAccess.InfoStoragePath)
            }
          }
  
          execute {
            log("Finished setting up the account for FLOATs.")
          }
        }
        `,
      args: (arg, t) => [],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 999,
    });

    console.log("txId", txId)
    txId.set(transactionId);

    fcl.tx(transactionId).subscribe((res) => {
      transactionStatus.set(res.status);
      if (res.status === 4) {
        if (res.statusCode === 0) {
          setupAccountStatus.set(respondWithSuccess());
        } else {
          setupAccountStatus.set(
            respondWithError(
              parseErrorMessageFromFCL(res.errorMessage),
              res.statusCode
            )
          );
        }
        setupAccountInProgress.set(false);
        setTimeout(() => transactionInProgress.set(false), 2000);
      }
    });

    let res = await fcl.tx(transactionId).onceSealed();
    return res;
  } catch (e) {
    setupAccountStatus.set(false);
    transactionStatus.set(99);
    console.log(e);

    setTimeout(() => transactionInProgress.set(false), 10000);
  }
};

const convertDraftFloat = (draftFloat) => {
  let secrets = [];
  if (draftFloat.multipleSecretsEnabled) {
    secrets = draftFloat.claimCode.split(", ");
  } else {
    secrets = [draftFloat.claimCode];
  }
  return {
    claimable: draftFloat.claimable,
    name: draftFloat.name,
    description: draftFloat.description,
    image: draftFloat.ipfsHash,
    url: draftFloat.url,
    transferrable: draftFloat.transferrable,
    timelock: draftFloat.timelock ? true : false,
    dateStart: draftFloat.startTime
      ? +new Date(draftFloat.startTime) / 1000
      : 0,
    timePeriod:
      draftFloat.startTime && draftFloat.endTime
        ? +new Date(draftFloat.endTime) / 1000 -
          +new Date(draftFloat.startTime) / 1000
        : 0,
    secret: draftFloat.claimCodeEnabled ? true : false,
    secrets: secrets,
    limited: draftFloat.quantity ? true : false,
    capacity: draftFloat.quantity ? draftFloat.quantity : 0,
    initialGroups: draftFloat.initialGroup ? [draftFloat.initialGroup] : [],
    flowTokenPurchase: draftFloat.flowTokenPurchase ? true : false,
    flowTokenCost: draftFloat.flowTokenPurchase
      ? String(draftFloat.flowTokenPurchase.toFixed(2))
      : "0.0",
  };
};

export const createEvent = async (forHost, draftFloat) => {
  let floatObject = convertDraftFloat(draftFloat);

  eventCreationInProgress.set(true);

  let transactionId = false;
  initTransactionState();

  try {
    transactionId = await fcl.mutate({
      cadence: `
        import FLOAT from 0xFLOAT
        import FLOATVerifiers from 0xFLOAT
        import NonFungibleToken from 0xCORE
        import MetadataViews from 0xCORE
        import GrantedAccountAccess from 0xFLOAT
  
        transaction(
          forHost: Address, 
          claimable: Bool, 
          name: String, 
          description: String, 
          image: String, 
          url: String, 
          transferrable: Bool, 
          timelock: Bool, 
          dateStart: UFix64, 
          timePeriod: UFix64, 
          secret: Bool, 
          secrets: [String], 
          limited: Bool, 
          capacity: UInt64, 
          initialGroups: [String], 
          flowTokenPurchase: Bool, 
          flowTokenCost: UFix64
        ) {
        
          let FLOATEvents: &FLOAT.FLOATEvents
        
          prepare(acct: AuthAccount) {
            // SETUP COLLECTION
            if acct.borrow<&FLOAT.Collection>(from: FLOAT.FLOATCollectionStoragePath) == nil {
                acct.save(<- FLOAT.createEmptyCollection(), to: FLOAT.FLOATCollectionStoragePath)
                acct.link<&FLOAT.Collection{NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection, FLOAT.CollectionPublic}>
                        (FLOAT.FLOATCollectionPublicPath, target: FLOAT.FLOATCollectionStoragePath)
            }
        
            // SETUP FLOATEVENTS
            if acct.borrow<&FLOAT.FLOATEvents>(from: FLOAT.FLOATEventsStoragePath) == nil {
              acct.save(<- FLOAT.createEmptyFLOATEventCollection(), to: FLOAT.FLOATEventsStoragePath)
              acct.link<&FLOAT.FLOATEvents{FLOAT.FLOATEventsPublic, MetadataViews.ResolverCollection}>
                        (FLOAT.FLOATEventsPublicPath, target: FLOAT.FLOATEventsStoragePath)
            }
        
            // SETUP SHARED MINTING
            if acct.borrow<&GrantedAccountAccess.Info>(from: GrantedAccountAccess.InfoStoragePath) == nil {
                acct.save(<- GrantedAccountAccess.createInfo(), to: GrantedAccountAccess.InfoStoragePath)
                acct.link<&GrantedAccountAccess.Info{GrantedAccountAccess.InfoPublic}>
                        (GrantedAccountAccess.InfoPublicPath, target: GrantedAccountAccess.InfoStoragePath)
            }
            
            if forHost != acct.address {
              let FLOATEvents = acct.borrow<&FLOAT.FLOATEvents>(from: FLOAT.FLOATEventsStoragePath)
                                ?? panic("Could not borrow the FLOATEvents from the signer.")
              self.FLOATEvents = FLOATEvents.borrowSharedRef(fromHost: forHost)
            } else {
              self.FLOATEvents = acct.borrow<&FLOAT.FLOATEvents>(from: FLOAT.FLOATEventsStoragePath)
                                ?? panic("Could not borrow the FLOATEvents from the signer.")
            }
          }
        
          execute {
            var Timelock: FLOATVerifiers.Timelock? = nil
            var Secret: FLOATVerifiers.Secret? = nil
            var Limited: FLOATVerifiers.Limited? = nil
            var MultipleSecret: FLOATVerifiers.MultipleSecret? = nil
            var verifiers: [{FLOAT.IVerifier}] = []
            if timelock {
              Timelock = FLOATVerifiers.Timelock(_dateStart: dateStart, _timePeriod: timePeriod)
              verifiers.append(Timelock!)
            }
            if secret {
              if secrets.length == 1 {
                Secret = FLOATVerifiers.Secret(_secretPhrase: secrets[0])
                verifiers.append(Secret!)
              } else {
                MultipleSecret = FLOATVerifiers.MultipleSecret(_secrets: secrets)
                verifiers.append(MultipleSecret!)
              }
            }
            if limited {
              Limited = FLOATVerifiers.Limited(_capacity: capacity)
              verifiers.append(Limited!)
            }
            let extraMetadata: {String: AnyStruct} = {}
            if flowTokenPurchase {
              let tokenInfo = FLOAT.TokenInfo(_path: /public/flowTokenReceiver, _price: flowTokenCost)
              extraMetadata["prices"] = {"${flowTokenIdentifier}.FlowToken.Vault": tokenInfo}
            }
            self.FLOATEvents.createEvent(claimable: claimable, description: description, image: image, name: name, transferrable: transferrable, url: url, verifiers: verifiers, extraMetadata, initialGroups: initialGroups)
            log("Started a new event for host.")
          }
        }  
        `,
      args: (arg, t) => [
        arg(forHost, t.Address),
        arg(floatObject.claimable, t.Bool),
        arg(floatObject.name, t.String),
        arg(floatObject.description, t.String),
        arg(floatObject.image, t.String),
        arg(floatObject.url, t.String),
        arg(floatObject.transferrable, t.Bool),
        arg(floatObject.timelock, t.Bool),
        arg(floatObject.dateStart.toFixed(1), t.UFix64),
        arg(floatObject.timePeriod.toFixed(1), t.UFix64),
        arg(floatObject.secret, t.Bool),
        arg(floatObject.secrets, t.Array(t.String)),
        arg(floatObject.limited, t.Bool),
        arg(floatObject.capacity, t.UInt64),
        arg(floatObject.initialGroups, t.Array(t.String)),
        arg(floatObject.flowTokenPurchase, t.Bool),
        arg(floatObject.flowTokenCost, t.UFix64),
      ],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 9999,
    });

    txId.set(transactionId);

    fcl.tx(transactionId).subscribe((res) => {
      transactionStatus.set(res.status);
      if (res.status === 4) {
        if (res.statusCode === 0) {
          eventCreatedStatus.set(respondWithSuccess());
        } else {
          eventCreatedStatus.set(
            respondWithError(
              parseErrorMessageFromFCL(res.errorMessage),
              res.statusCode
            )
          );
        }
        eventCreationInProgress.set(false);
        setTimeout(() => transactionInProgress.set(false), 2000);
      }
    });

    let res = await fcl.tx(transactionId).onceSealed();
    return res;
  } catch (e) {
    eventCreatedStatus.set(false);
    transactionStatus.set(99);
    console.log(e);

    setTimeout(() => transactionInProgress.set(false), 10000);
  }
};

// getEvents for the event id
export const getEvents = async (addr) => {
  try {
    let queryResult = await fcl.query({
      cadence: `
      import FLOAT from 0xFLOAT

      pub fun main(account: Address): {UFix64: FLOATEventMetadata} {
        let floatEventCollection = getAccount(account).getCapability(FLOAT.FLOATEventsPublicPath)
                                    .borrow<&FLOAT.FLOATEvents{FLOAT.FLOATEventsPublic}>()
                                    ?? panic("Could not borrow the FLOAT Events Collection from the account.")
        let floatEvents: [UInt64] = floatEventCollection.getIDs() 
        let returnVal: {UFix64: FLOATEventMetadata} = {}

        for eventId in floatEvents {
          let event = floatEventCollection.borrowPublicEventRef(eventId: eventId) ?? panic("This event does not exist in the account")
          let metadata = FLOATEventMetadata(
            _claimable: event.claimable, 
            _dateCreated: event.dateCreated, 
            _description: event.description, 
            _eventId: event.eventId, 
            _extraMetadata: event.getExtraMetadata(), 
            _groups: event.getGroups(), 
            _host: event.host, 
            _image: event.image, 
            _name: event.name, 
            _totalSupply: event.totalSupply, 
            _transferrable: event.transferrable, 
            _url: event.url, 
            _verifiers: event.getVerifiers()
          )
          returnVal[event.dateCreated] = metadata
        }
        return returnVal
      }

      pub struct FLOATEventMetadata {
        pub let claimable: Bool
        pub let dateCreated: UFix64
        pub let description: String 
        pub let eventId: UInt64
        pub let extraMetadata: {String: AnyStruct}
        pub let groups: [String]
        pub let host: Address
        pub let image: String 
        pub let name: String
        pub let totalSupply: UInt64
        pub let transferrable: Bool
        pub let url: String
        pub let verifiers: {String: [{FLOAT.IVerifier}]}

        init(
            _claimable: Bool,
            _dateCreated: UFix64,
            _description: String, 
            _eventId: UInt64,
            _extraMetadata: {String: AnyStruct},
            _groups: [String],
            _host: Address, 
            _image: String, 
            _name: String,
            _totalSupply: UInt64,
            _transferrable: Bool,
            _url: String,
            _verifiers: {String: [{FLOAT.IVerifier}]}
        ) {
            self.claimable = _claimable
            self.dateCreated = _dateCreated
            self.description = _description
            self.eventId = _eventId
            self.extraMetadata = _extraMetadata
            self.groups = _groups
            self.host = _host
            self.image = _image
            self.name = _name
            self.transferrable = _transferrable
            self.totalSupply = _totalSupply
            self.url = _url
            self.verifiers = _verifiers
        }
      }
      `,
      args: (arg, t) => [
        arg(addr, t.Address)
      ]
    })
    return queryResult || {};
  } catch (e) {
  }
}


export const claimFLOAT = async (eventId, host, secret) => {

  let transactionId = false;
  initTransactionState()

  floatClaimingInProgress.set(true);

  try {
    transactionId = await fcl.mutate({
      cadence: `
      import FLOAT from 0xFLOAT
      import FLOATVerifiers from 0xFLOAT
      import NonFungibleToken from 0xCORE
      import MetadataViews from 0xCORE
      import GrantedAccountAccess from 0xFLOAT
      import FlowToken from 0xFLOWTOKEN

      transaction(eventId: UInt64, host: Address, secret: String?) {
 
        let FLOATEvent: &FLOAT.FLOATEvent{FLOAT.FLOATEventPublic}
        let Collection: &FLOAT.Collection
        let FlowTokenVault: &FlowToken.Vault
      
        prepare(acct: AuthAccount) {
          // SETUP COLLECTION
          if acct.borrow<&FLOAT.Collection>(from: FLOAT.FLOATCollectionStoragePath) == nil {
              acct.save(<- FLOAT.createEmptyCollection(), to: FLOAT.FLOATCollectionStoragePath)
              acct.link<&FLOAT.Collection{NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection, FLOAT.CollectionPublic}>
                      (FLOAT.FLOATCollectionPublicPath, target: FLOAT.FLOATCollectionStoragePath)
          }
      
          // SETUP FLOATEVENTS
          if acct.borrow<&FLOAT.FLOATEvents>(from: FLOAT.FLOATEventsStoragePath) == nil {
            acct.save(<- FLOAT.createEmptyFLOATEventCollection(), to: FLOAT.FLOATEventsStoragePath)
            acct.link<&FLOAT.FLOATEvents{FLOAT.FLOATEventsPublic, MetadataViews.ResolverCollection}>
                      (FLOAT.FLOATEventsPublicPath, target: FLOAT.FLOATEventsStoragePath)
          }
      
          // SETUP SHARED MINTING
          if acct.borrow<&GrantedAccountAccess.Info>(from: GrantedAccountAccess.InfoStoragePath) == nil {
              acct.save(<- GrantedAccountAccess.createInfo(), to: GrantedAccountAccess.InfoStoragePath)
              acct.link<&GrantedAccountAccess.Info{GrantedAccountAccess.InfoPublic}>
                      (GrantedAccountAccess.InfoPublicPath, target: GrantedAccountAccess.InfoStoragePath)
          }
      
          let FLOATEvents = getAccount(host).getCapability(FLOAT.FLOATEventsPublicPath)
                              .borrow<&FLOAT.FLOATEvents{FLOAT.FLOATEventsPublic}>()
                              ?? panic("Could not borrow the public FLOATEvents from the host.")
          self.FLOATEvent = FLOATEvents.borrowPublicEventRef(eventId: eventId) ?? panic("This event does not exist.")
      
          self.Collection = acct.borrow<&FLOAT.Collection>(from: FLOAT.FLOATCollectionStoragePath)
                              ?? panic("Could not get the Collection from the signer.")
          
          self.FlowTokenVault = acct.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                                  ?? panic("Could not borrow the FlowToken.Vault from the signer.")
        }
      
        execute {
          let params: {String: AnyStruct} = {}
      
          // If the FLOAT has a secret phrase on it
          if let unwrappedSecret = secret {
            params["secretPhrase"] = unwrappedSecret
          }
       
          // If the FLOAT costs something
          if let prices = self.FLOATEvent.getPrices() {
            log(prices)
            let payment <- self.FlowTokenVault.withdraw(amount: prices[self.FlowTokenVault.getType().identifier]!.price)
            self.FLOATEvent.purchase(recipient: self.Collection, params: params, payment: <- payment)
            log("Purchased the FLOAT.")
          }
          // If the FLOAT is free 
          else {
            self.FLOATEvent.claim(recipient: self.Collection, params: params)
            log("Claimed the FLOAT.")
          }
        }
      }      
      `,
      args: (arg, t) => [
        arg(parseInt(eventId), t.UInt64),
        arg(host, t.Address),
        arg(secret, t.Optional(t.String)),
      ],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 999
    })

    txId.set(transactionId);

    fcl.tx(transactionId).subscribe(res => {
      transactionStatus.set(res.status)
      if (res.status === 4) {
        if (res.statusCode === 0) {
          floatClaimedStatus.set(respondWithSuccess());
        } else {
          floatClaimedStatus.set(respondWithError(parseErrorMessageFromFCL(res.errorMessage), res.statusCode));
        }
        floatClaimingInProgress.set(false);
        draftFloat.set({
          claimable: true,
          transferrable: true,
        })

        setTimeout(() => transactionInProgress.set(false), 2000)
      }
    })

  } catch (e) {
    transactionStatus.set(99)
    floatClaimedStatus.set(respondWithError(e));
    floatClaimingInProgress.set(false);

    console.log(e)
  }
}

export const getFLOATs = async (addr) => {
  try {
    let queryResult = await fcl.query({
      cadence: `
      import FLOAT from 0xFLOAT
      
      pub fun main(account: Address): {UFix64: CombinedMetadata} {
        let floatCollection = getAccount(account).getCapability(FLOAT.FLOATCollectionPublicPath)
                              .borrow<&FLOAT.Collection{FLOAT.CollectionPublic}>()
                              ?? panic("Could not borrow the Collection from the account.")
        let ids = floatCollection.getIDs()
        var returnVal: {UFix64: CombinedMetadata} = {}
        for id in ids {
          let nft: &FLOAT.NFT = floatCollection.borrowFLOAT(id: id)!
          let eventId = nft.eventId
          let eventHost = nft.eventHost
      
          let event = nft.getEventMetadata()
          returnVal[nft.dateReceived] = CombinedMetadata(_float: nft, _totalSupply: event?.totalSupply, _transferrable: event?.transferrable)
        }
      
        return returnVal
      }
      
      pub struct CombinedMetadata {
          pub let float: &FLOAT.NFT
          pub let totalSupply: UInt64?
          pub let transferrable: Bool?
      
          init(
              _float: &FLOAT.NFT,
              _totalSupply: UInt64?,
              _transferrable: Bool?
          ) {
              self.float = _float
              self.totalSupply = _totalSupply
              self.transferrable = _transferrable
          }
      }
      `,
      args: (arg, t) => [
        arg(addr, t.Address)
      ]
    })
    return Object.values(queryResult) || {};
  } catch (e) {
    console.log(e)
  }
}

function initTransactionState() {
  transactionInProgress.set(true);
  transactionStatus.set(-1);
}