export const isBoilPowerKettle = (kettle) => {
  const logicType = kettle?.type;
  if (typeof logicType !== "string") return false;
  return logicType.toLowerCase().replace(/[^a-z0-9]/g, "").includes("boilpower");
};
