<template>
  <div >
    <h1 class="text-xl font-bold text-center py-4">Исторические данные о ценах на биткоин</h1>
    <price-chart />
  </div>
</template>

<script>
import PriceChart from '~/components/PriceChart.vue'

export default {
  components: {
    PriceChart
  }
}
</script>