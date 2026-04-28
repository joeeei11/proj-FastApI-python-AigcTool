import React, { createContext, useContext, useState } from 'react';

// 模块级变量供 API 拦截器使用（不存 localStorage，刷新即清空）
let _token = null;
export function getMemoryToken() { return _token; }

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ token: null, userInfo: null });

  const login = (token, userInfo) => {
    _token = token;
    setAuth({ token, userInfo });
  };

  const logout = () => {
    _token = null;
    setAuth({ token: null, userInfo: null });
  };

  const updateUserInfo = (updates) => {
    setAuth(prev => ({ ...prev, userInfo: { ...prev.userInfo, ...updates } }));
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateUserInfo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
