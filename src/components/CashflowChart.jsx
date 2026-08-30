import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function CashflowChart({ data }) {

  const chartData = {
    labels: data.map(item => item.tanggal),
    datasets: [
      {
        label: "Saldo",
        data: data.map(item => item.saldo),
        borderColor: "#2563eb",
        backgroundColor: "#2563eb"
      }
    ]
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow mt-6">
      <Line data={chartData} />
    </div>
  );
}

export default CashflowChart;