<template>
  <div class="w-full">
    <div class="flex flex-row justify-between items-center mb-4 mx-5">
      <button @click="setPeriod('day')" class="btn">День</button>
      <button @click="setPeriod('week')" class="btn">Неделя</button>
      <button @click="setPeriod('month')" class="btn">Месяц</button>
      <button @click="setPeriod('year')" class="btn">Год</button>
    </div>
    <div class="flex flex-row items-center mb-4 mx-5 w-full justify-center">
      <label class="mr-2"
        >С: <input type="date" v-model="startDate" class="input"
      /></label>
      <label class="mr-2"
        >По: <input type="date" v-model="endDate" class="input"
      /></label>
      <button @click="fetchCustomPeriod" class="btn">Применить</button>
    </div>
    <div v-if="isDataAvailable" class="chart-container mx-3">
      <line-chart :data="chartData" :options="chartOptions" />
    </div>
    <div v-else>Загрузка данных...</div>
  </div>
</template>

<script>
// import { ref, computed, onMounted} from 'vue'
import { Line as LineChart } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
} from "chart.js";
import { ref, computed, onMounted, useContext } from "@nuxtjs/composition-api";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
);

export default {
  components: {
    LineChart,
  },
  setup() {
    const { $axios } = useContext();
    const chartData = ref({
      labels: [],
      datasets: [
        {
          label: "Цена биткоина (USD)",
          data: [],
          borderColor: "#3e95cd",
          fill: false,
        },
      ],
    });

    const startDate = ref("");
    const endDate = ref("");

    const chartOptions = ref({
      responsive: true,
      maintainAspectRatio: false,
    });

    const isDataAvailable = computed(() => {
      return (
        chartData.value.labels.length > 0 &&
        chartData.value.datasets[0].data.length > 0
      );
    });

    const setPeriod = async (period) => {
      const end = Math.floor(Date.now() / 1000);
      let start;
      switch (period) {
        case "day":
          start = end - 24 * 60 * 60;
          break;
        case "week":
          start = end - 7 * 24 * 60 * 60;
          break;
        case "month":
          start = end - 30 * 24 * 60 * 60;
          break;
        case "year":
          start = end - 365 * 24 * 60 * 60;
          break;
      }
      await fetchPriceData(start, end);
    };

    const fetchCustomPeriod = async () => {
      const start = Math.floor(new Date(startDate.value).getTime() / 1000);
      const end = Math.floor(new Date(endDate.value).getTime() / 1000);
      await fetchPriceData(start, end);
    };

    const fetchPriceData = async (start, end) => {
      try {
        const response = await $axios.$get("/api/prices", {
          params: { start, end },
        });
        if (response && response.data) {
          updateChartData(response.data);
        } else if (Array.isArray(response)) {
          updateChartData(response);
        } else {
          console.error("Unexpected API response structure:", response);
        }
      } catch (error) {
        console.error("Error fetching price data:", error);
      }
    };

    const updateChartData = (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const newChartData = {
          labels: data.map((item) => {
            const date = new Date(item.timestamp * 1000);
            return date.toLocaleDateString();
          }),
          datasets: [
            {
              label: "Цена биткоина (USD)",
              data: data.map((item) => item.price),
              borderColor: "#3e95cd",
              fill: false,
            },
          ],
        };

        chartData.value = newChartData;
      } else {
        console.warn("Invalid or empty data received:", data);
      }
    };

    onMounted(() => {
      setPeriod("month");
    });

    return {
      chartData,
      chartOptions,
      startDate,
      endDate,
      setPeriod,
      fetchCustomPeriod,
      isDataAvailable,
    };
  },
};
</script>

<style scoped>
.btn {
  @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2;
}
.input {
  @apply px-2 py-1 border rounded;
}
.chart-container {
  @apply h-96;
}
</style>
