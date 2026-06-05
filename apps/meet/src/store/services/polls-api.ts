import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { toBinary } from '@bufbuild/protobuf';
import {
  ClosePollReq,
  ClosePollReqSchema,
  CreatePollReq,
  CreatePollReqSchema,
  PollResponse,
  PollResponseSchema,
  SubmitPollResponseReq,
  SubmitPollResponseReqSchema,
} from '@workspace/protocol';

import { handleProtobufResponse, renewTokenOnError } from '@/store/services/utils';
import { RootState } from '@/store/index';
import { SERVER_URL } from '@/config';

export const pollsApi = createApi({
  reducerPath: 'pollsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: SERVER_URL + '/api/polls',
    prepareHeaders: (headers, { getState, endpoint }) => {
      const token = (getState() as RootState).session.token;
      if (token) {
        headers.set('Authorization', token);
      }
      // Debug: log headers to see what's happening
      console.log(`[${endpoint}] Headers before return:`, {
        contentType: headers.get('content-type'),
        authorization: headers.get('authorization') ? 'present' : 'missing',
      });
      return headers;
    },
  }),
  tagTypes: [
    'List',
    'PollsStats',
    'Count',
    'Selected',
    'PollDetails',
    'PollResult',
  ],
  endpoints: (builder) => ({
    getPollLists: builder.query<PollResponse, void>({
      query: () => {
        return {
          url: 'listPolls',
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: ['List'],
    }),
    getCountTotalResponses: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `countTotalResponses/${poll_id}`,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: (result) => {
        return result?.status
          ? ['Count', { type: 'Count' as const, id: result?.pollId }]
          : ['Count'];
      },
    }),
    getUserSelectedOption: builder.query<
      PollResponse,
      { pollId: string; userId: string }
    >({
      query: ({ pollId, userId }) => {
        return {
          url: `userSelectedOption/${pollId}/${userId}`,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: (result) => {
        return result?.status
          ? ['Selected', { type: 'Selected' as const, id: result.pollId }]
          : ['Selected'];
      },
    }),
    getPollResponsesDetails: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `pollResponsesDetails/${poll_id}`,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: (result) => {
        return result?.status
          ? ['PollDetails', { type: 'PollDetails' as const, id: result.pollId }]
          : ['PollDetails'];
      },
    }),
    getPollResponsesResult: builder.query<PollResponse, string>({
      query: (poll_id) => {
        return {
          url: `pollResponsesResult/${poll_id}`,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: (result) => {
        return result?.status
          ? ['PollResult', { type: 'PollResult' as const, id: result.pollId }]
          : ['PollResult'];
      },
    }),
    getPollsStats: builder.query<PollResponse, void>({
      query: () => {
        return {
          url: 'pollsStats',
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      providesTags: ['PollsStats'],
    }),
    createPoll: builder.mutation<PollResponse, CreatePollReq>({
      query(body) {
        const binaryData = toBinary(CreatePollReqSchema, body);
        // Wrap binary in Blob to ensure Content-Type is sent correctly
        const blob = new Blob([binaryData], { type: 'application/protobuf' });

        return {
          url: 'create',
          method: 'POST',
          headers: {
            'Content-Type': 'application/protobuf',
          },
          body: blob,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List', 'PollsStats'],
    }),
    addResponse: builder.mutation<PollResponse, SubmitPollResponseReq>({
      query(body) {
        const binaryData = toBinary(SubmitPollResponseReqSchema, body);
        const blob = new Blob([binaryData], { type: 'application/protobuf' });

        return {
          url: 'submitResponse',
          method: 'POST',
          headers: {
            'Content-Type': 'application/protobuf',
          },
          body: blob,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: (result, error, { pollId }) => [
        { type: 'Count', id: pollId },
        { type: 'Selected', id: pollId },
        { type: 'PollDetails', id: pollId },
      ],
    }),
    closePoll: builder.mutation<PollResponse, ClosePollReq>({
      query(body) {
        const binaryData = toBinary(ClosePollReqSchema, body);
        const blob = new Blob([binaryData], { type: 'application/protobuf' });

        return {
          url: 'closePoll',
          method: 'POST',
          headers: {
            'Content-Type': 'application/protobuf',
          },
          body: blob,
          responseHandler: handleProtobufResponse(PollResponseSchema),
        };
      },
      transformErrorResponse: renewTokenOnError,
      invalidatesTags: ['List', 'PollsStats'],
    }),
  }),
});

export const {
  useGetPollListsQuery,
  useGetCountTotalResponsesQuery,
  useGetUserSelectedOptionQuery,
  useGetPollResponsesDetailsQuery,
  useCreatePollMutation,
  useAddResponseMutation,
  useClosePollMutation,
  useGetPollResponsesResultQuery,
  useGetPollsStatsQuery,
} = pollsApi;
