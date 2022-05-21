<script>
  import { draftFloat, profile, user } from "../flow/stores";
  import { 
    sendQuery, 
    unauthenticate, 
    logIn, 
    signUp, 
    initAccount, 
  } from '../flow/actions';
  import {
    setupAccount,
    createEvent,
claimFLOAT
  } from "../flow/floats"
  
  import UserAddress from './UserAddress.svelte';
  import Profile from './Profile.svelte';
import Floats from "./components/Floats.svelte";
import Events from "./components/Events.svelte";

  const handleCreateEvent = () => {
   

    createEvent($user.addr, $draftFloat)
  }
  const handleClaimFloat = () => {
   
    claimFLOAT("95244882", $user.addr)

  }

</script>

<div class="grid">
  <div class="mb-2">
    {#if $user?.loggedIn && $profile}
      <Profile />
    {:else}
      <h1>Welcome to web3!</h1>
      <p>
        This is a starter app built on Flow. It demonstrates how to use the Flow
        Client Library (FCL) with SvelteKit.
      </p>
      {#if !$user?.loggedIn}
        <p>Login to get started.</p>
      {:else}
        <p>Create a profile and then click on Load Profile to see it here.</p>
      {/if}
    {/if}
  </div>
  <div>
    {#if $user?.loggedIn}
      <div>
        <div>
          You are now logged in as: <UserAddress /><button
            on:click={unauthenticate}>Log Out</button
          >
        </div>
        <h2>Controls</h2>
        <button on:click={setupAccount}>Create Profile</button>
        <button on:click={handleCreateEvent}>Create Event</button>
        <button on:click={handleClaimFloat}>Claim Float</button>
        <button on:click={() => sendQuery($user.addr)}>Load Profile</button>
      </div>
    {:else}
      <div>
        <button on:click={logIn}>Log In</button>
        <button on:click={signUp}>Sign Up</button>
      </div>
    {/if}
    <Events  addressObject={$user?.loggedIn && $user.addr} />
    <Floats  addressObject={$user?.loggedIn && $user.addr} />
  </div>
</div>
