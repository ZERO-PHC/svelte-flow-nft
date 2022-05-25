<script>
    import { page } from "$app/stores";
    import { getEvents } from "../../flow/floats";
  
    export let addressObject;
  
    let floatEvents = async () => {
    const rawEvents = await getEvents(addressObject);
    const formattedEvents = getEventsArray(rawEvents);

    console.log("formattedEvents", formattedEvents)

    return formattedEvents || [];
  }



  function getEventsArray(floatEventsObj) {
    if (floatEventsObj && Object.keys(floatEventsObj)?.length > 0) {
      return Object.values(floatEventsObj);
    } else {
      return [];
    }
  }

</script>

<article>
  {#await floatEvents()}
    cargando
  {:then floatEvents}
    {#if floatEvents.length > 0}
    {#each floatEvents as event }
        <div>{event.eventId}</div>
    {/each}
    {:else}
      noup
    {/if}
  {/await}
</article>

<style>
  .addnew {
    font-weight: bold;
    width: 100%;
  }

  @media screen and (max-width: 767px) {
    .addnew {
      margin-top: 20px;
    }
  }
</style>
