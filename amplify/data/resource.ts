import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  CodingProblem: a
    .model({
      title: a.string(),
      description: a.string(),
      difficulty: a.enum(['easy', 'medium', 'hard']),
      starterCode: a.string(),
      solution: a.string(),
      testCases: a.list(
        a.model({
          input: a.string(),
          expectedOutput: a.string(),
          description: a.string()
        })
      ),
      hints: a.list(a.string()),
      language: a.enum(['Python', 'JavaScript', 'Java', 'C#', 'TypeScript']),
      category: a.enum(['algorithms', 'data-structures', 'system-design', 'debugging']),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .authorization([a.allow.public('read'), a.allow.owner(['create', 'update', 'delete'])]),

  UserProgress: a
    .model({
      userId: a.string(),
      problemId: a.string(),
      status: a.enum(['started', 'completed', 'failed']),
      attempts: a.integer(),
      lastAttemptAt: a.datetime(),
      timeSpent: a.integer(), // in seconds
      solution: a.string(),
      feedback: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .authorization([a.allow.owner(['read', 'create', 'update', 'delete'])]),

  UserStats: a
    .model({
      userId: a.string(),
      problemsSolved: a.integer(),
      totalAttempts: a.integer(),
      averageAttempts: a.float(),
      averageTimePerProblem: a.integer(), // in seconds
      strongestCategory: a.string(),
      weakestCategory: a.string(),
      lastActive: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .authorization([a.allow.owner(['read', 'create', 'update', 'delete'])])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
