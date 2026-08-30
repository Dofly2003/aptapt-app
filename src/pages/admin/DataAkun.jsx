import { useState } from "react";
import FormAkun from "./FormAkun";
import TableAkun from "./TableAkun";

function DataAkun() {
  const [editData, setEditData] = useState(null);

  return (
    <div className="space-y-6">
      <FormAkun editData={editData} setEditData={setEditData} />
      <TableAkun onEdit={setEditData} />
    </div>
  );
}

export default DataAkun;