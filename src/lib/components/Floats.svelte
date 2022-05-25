<script>
    import { page } from "$app/stores";
    import { getFLOATs } from "../../flow/floats";
  
    export let addressObject;
  
    let floats = async () => {
      const floatsRaw = await getFLOATs(addressObject);
      const floatsFormatted = Object.values(floatsRaw || {})?.map((obj) => {
        return {
          totalSupply: obj.totalSupply,
          owner: $page.params.address,
          ...obj.float,
        };
      });

      console.log("formatted floats", floatsFormatted)

      return floatsFormatted || [];
    };


</script>

<article>
  {#await floats()}
    loading
  {:then floats}
    {#if floats.length > 0}
      {#each floats as float}
        <div>{float.id}</div>
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
