import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState(null);

  useEffect(() => {
    // Obtener sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchRol(session.user.id);
      }
      setLoading(false);
    });

    // Escuchar cambios en la autenticación (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        fetchRol(session.user.id);
      } else {
        setUser(null);
        setRol(null);
      }
      setLoading(false);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const fetchRol = async (userId) => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setRol(data.rol);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRol(null);
  };

  const value = { user, rol, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);