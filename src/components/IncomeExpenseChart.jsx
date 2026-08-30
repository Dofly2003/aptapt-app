import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

function IncomeExpenseChart({ income, expense }) {

  const data = {
    labels: ["Pemasukan", "Pengeluaran"],
    datasets: [
      {
        label: "Keuangan",
        data: [income, expense],
        backgroundColor: ["#16a34a", "#dc2626"]
      }
    ]
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow mt-6">
      <Bar data={data} />
    </div>
  );
}

export default IncomeExpenseChart;