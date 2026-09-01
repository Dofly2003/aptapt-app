import { createContext, useCallback, useContext, useMemo, useState } from "react";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("Loading...");

  const startLoading = useCallback((msg = "Loading...") => {
    setText(msg);
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const contextValue = useMemo(() => ({
    loading,
    text,
    startLoading,
    stopLoading,
  }), [loading, text, startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);