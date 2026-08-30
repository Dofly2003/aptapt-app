function Card({ title, value, color }) {

  const colors = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    yellow: "text-yellow-500"
  };

  return (

    <div className="bg-white rounded-lg shadow-sm px-4 py-3">

      <p className="text-xs text-gray-500">
        {title}
      </p>

      <h3 className={`text-lg font-semibold ${colors[color]}`}>

        {typeof value === "number"
          ? `Rp ${value.toLocaleString()}`
          : value}

      </h3>

    </div>

  );
}

export default Card;