import hash from "object-hash";

export const hashObject = (obj: any) => {
  return hash(obj);
};
