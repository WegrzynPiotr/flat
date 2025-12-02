import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../api/endpoints';
import { User } from '../../types/api';
import { storage } from '../../utils/storage';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(email, password);
      console.log('Login response:', response.data);
      const { accessToken, refreshToken, user } = response.data;
      
      if (!accessToken || !refreshToken || !user) {
        console.error('Missing data in response:', { accessToken: !!accessToken, refreshToken: !!refreshToken, user: !!user });
        return rejectWithValue('Invalid response from server');
      }
      
      await storage.setItemAsync('authToken', accessToken);
      await storage.setItemAsync('refreshToken', refreshToken);
      
      console.log('Login successful for user:', user.email);
      return { accessToken, refreshToken, user };
    } catch (error: any) {
      console.error('Login error:', error);
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      const { accessToken, refreshToken, user } = response.data;
      
      // Backend zwraca tokeny i automatycznie loguje użytkownika
      if (accessToken && refreshToken) {
        await storage.setItemAsync('authToken', accessToken);
        await storage.setItemAsync('refreshToken', refreshToken);
        return { accessToken, refreshToken, user };
      }
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;
      
      if (refreshToken) {
        // Wywołaj endpoint backend aby unieważnić refresh token
        await authAPI.logout(refreshToken);
      }
      
      // Usuń tokeny z lokalnego storage
      await storage.deleteItemAsync('authToken');
      await storage.deleteItemAsync('refreshToken');
      
      return true;
    } catch (error: any) {
      // Nawet jeśli backend zwróci błąd, wyloguj lokalnie
      await storage.deleteItemAsync('authToken');
      await storage.deleteItemAsync('refreshToken');
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = await storage.getItemAsync('authToken');
      const refreshToken = await storage.getItemAsync('refreshToken');
      
      if (!accessToken || !refreshToken) {
        return null;
      }
      
      // Sprawdź czy token jest jeszcze ważny, pobierając dane użytkownika
      const response = await authAPI.getMe();
      const user = response.data;
      
      return { accessToken, refreshToken, user };
    } catch (error: any) {
      // Token nieważny - usuń z storage
      await storage.deleteItemAsync('authToken');
      await storage.deleteItemAsync('refreshToken');
      return rejectWithValue('Session expired');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      // Synchroniczne wylogowanie (np. przy błędzie 401)
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      storage.deleteItemAsync('authToken');
      storage.deleteItemAsync('refreshToken');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        // Jeśli backend zwrócił tokeny, zaloguj użytkownika
        if (action.payload.accessToken && action.payload.refreshToken) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      })
      .addCase(logoutAsync.rejected, (state) => {
        // Nawet przy błędzie wyloguj lokalnie
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      })
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      });
  },
});

export const { logout, setUser, setTokens } = authSlice.actions;
export default authSlice.reducer;
