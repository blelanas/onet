import { createContext, useContext } from "react";

export const FieldErrorsContext = createContext<Record<string, string>>({});
export const useFieldError = (name?: string) => {
  const errors = useContext(FieldErrorsContext);
  return name ? errors[name] : undefined;
};
