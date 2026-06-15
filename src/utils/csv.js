export function jsonToCsv(data, columns, filename = "export.csv") {
  if (!data || !data.length) {
    return;
  }

  // Generate CSV header
  const header = columns.map(col => `"${col.title.replace(/"/g, '""')}"`).join(",");

  // Generate CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      let val = "";
      if (typeof col.dataIndex === "function") {
        val = col.dataIndex(row);
      } else if (typeof col.dataIndex === "string") {
        val = row[col.dataIndex];
      }
      
      if (val === null || val === undefined) val = "";
      
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  
  // Create Blob with UTF-8 BOM so Excel opens it with correct encoding
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
