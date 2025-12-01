import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { issuesAPI } from '../../api/endpoints';
import { Issue } from '../../types/api';

export interface IssuesState {
  issues: Issue[];
  selectedIssue: Issue | null;
  loading: boolean;
  error: string | null;
}

const initialState: IssuesState = {
  issues: [],
  selectedIssue: null,
  loading: false,
  error: null,
};

export const fetchIssues = createAsyncThunk(
  'issues/fetchAll',
  async (filters: any = {}, { rejectWithValue }) => {
    try {
      const response = await issuesAPI.getAll(filters);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch issues');
    }
  }
);

export const fetchIssueById = createAsyncThunk(
  'issues/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await issuesAPI.getById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch issue');
    }
  }
);

export const createIssue = createAsyncThunk(
  'issues/create',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await issuesAPI.create(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create issue');
    }
  }
);

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    clearSelectedIssue: (state) => {
      state.selectedIssue = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = action.payload;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchIssueById.fulfilled, (state, action) => {
        state.selectedIssue = action.payload;
      })
      .addCase(createIssue.pending, (state) => {
        state.loading = true;
      })
      .addCase(createIssue.fulfilled, (state, action) => {
        state.loading = false;
        state.issues.push(action.payload);
      });
  },
});

export const { clearSelectedIssue } = issuesSlice.actions;
export default issuesSlice.reducer;
