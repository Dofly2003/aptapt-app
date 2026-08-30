export const generateProjectId = (projectName) => {

 const now = new Date();

 const year = now.getFullYear();
 const month = String(now.getMonth()+1).padStart(2,"0");
 const day = String(now.getDate()).padStart(2,"0");
 const hour = String(now.getHours()).padStart(2,"0");

 const name = projectName
  .replace(/\s+/g,"")
  .toUpperCase();

 return `APT${year}${month}${day}${hour}-${name}`;

};