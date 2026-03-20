jest.mock("../../../src/server/lib/book-payload", () => ({
  validateCreateBookPayload: jest.fn((value) => value),
  validateUpdateBookPayload: jest.fn((value) => value),
}));

jest.mock("../../../src/server/middleware/auth", () => ({
  UnauthorizedError: class UnauthorizedError extends Error {
    statusCode = 401;
  },
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock("../../../src/server/models/book", () => ({
  deleteBook: jest.fn(),
  findBookById: jest.fn(),
  insertBook: jest.fn(),
  listBooksByUserId: jest.fn(),
  toPublicBook: jest.fn((book) => book),
  updateBook: jest.fn(),
}));

import booksHandler from "../index";
import bookByIdHandler from "../[id]";

import { requireAuthenticatedUser } from "@/server/middleware/auth";
import {
  deleteBook,
  findBookById,
  insertBook,
  listBooksByUserId,
  toPublicBook,
  updateBook,
} from "@/server/models/book";
import {
  validateCreateBookPayload,
  validateUpdateBookPayload,
} from "@/server/lib/book-payload";

type HandlerRequest = Parameters<typeof booksHandler>[0];
type HandlerResponse = Parameters<typeof booksHandler>[1];

type MockResponse = {
  headers: Record<string, string>;
  jsonBody: unknown;
  statusCode: number;
  json: jest.Mock;
  setHeader: jest.Mock;
  status: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    headers: {},
    jsonBody: undefined,
    statusCode: 200,
    json: jest.fn((body: unknown) => {
      response.jsonBody = body;
      return response;
    }),
    setHeader: jest.fn((name: string, value: string) => {
      response.headers[name] = value;
      return response;
    }),
    status: jest.fn((statusCode: number) => {
      response.statusCode = statusCode;
      return response;
    }),
  };

  return response;
};

const createRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    body: {},
    headers: {},
    method: "GET",
    query: {},
    ...overrides,
  }) as unknown as HandlerRequest;

describe("book route ownership enforcement", () => {
  const sampleBook = {
    id: "book-1",
    title: "Owned Book",
    author: "Author",
    spineColor: 3,
    addedDate: "2026-03-19T12:00:00.000Z",
    createdAt: "2026-03-19T12:00:00.000Z",
    updatedAt: "2026-03-19T12:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
  });

  it("lists books only for the authenticated user", async () => {
    (listBooksByUserId as jest.Mock).mockResolvedValue([
      sampleBook,
    ]);

    const request = createRequest({ method: "GET" });
    const response = createMockResponse();

    await booksHandler(request, response as unknown as HandlerResponse);

    expect(listBooksByUserId).toHaveBeenCalledWith("user-1");
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual([sampleBook]);
  });

  it("creates a book for the authenticated user", async () => {
    (validateCreateBookPayload as jest.Mock).mockReturnValue(sampleBook);
    (findBookById as jest.Mock).mockResolvedValue(null);
    (insertBook as jest.Mock).mockResolvedValue(sampleBook);

    const request = createRequest({
      method: "POST",
      body: sampleBook,
    });
    const response = createMockResponse();

    await booksHandler(request, response as unknown as HandlerResponse);

    expect(validateCreateBookPayload).toHaveBeenCalledWith(sampleBook);
    expect(findBookById).toHaveBeenCalledWith("user-1", "book-1");
    expect(insertBook).toHaveBeenCalledWith("user-1", sampleBook);
    expect(response.statusCode).toBe(201);
    expect(response.jsonBody).toEqual(sampleBook);
  });

  it("returns 409 when creating a book with an existing id for the same user", async () => {
    (validateCreateBookPayload as jest.Mock).mockReturnValue(sampleBook);
    (findBookById as jest.Mock).mockResolvedValue(sampleBook);

    const request = createRequest({
      method: "POST",
      body: sampleBook,
    });
    const response = createMockResponse();

    await booksHandler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(409);
    expect(response.jsonBody).toEqual({
      error: {
        code: "CONFLICT",
        message: "A book with that id already exists for this user.",
        details: undefined,
      },
    });
  });

  it("returns the requested book when it is owned by the authenticated user", async () => {
    (findBookById as jest.Mock).mockResolvedValue(sampleBook);

    const request = createRequest({
      method: "GET",
      query: { id: "book-1" },
    });
    const response = createMockResponse();

    await bookByIdHandler(request, response as unknown as HandlerResponse);

    expect(findBookById).toHaveBeenCalledWith("user-1", "book-1");
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual(sampleBook);
  });

  it("returns 404 when the requested book is not owned by the authenticated user", async () => {
    (findBookById as jest.Mock).mockResolvedValue(null);

    const request = createRequest({
      method: "GET",
      query: { id: "book-2" },
    });
    const response = createMockResponse();

    await bookByIdHandler(request, response as unknown as HandlerResponse);

    expect(findBookById).toHaveBeenCalledWith("user-1", "book-2");
    expect(response.statusCode).toBe(404);
    expect(response.jsonBody).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Book not found.",
        details: undefined,
      },
    });
  });

  it("returns 404 when updating a book not owned by the authenticated user", async () => {
    (validateUpdateBookPayload as jest.Mock).mockReturnValue({
      title: "Updated Title",
    });
    (updateBook as jest.Mock).mockResolvedValue(null);

    const request = createRequest({
      method: "PUT",
      query: { id: "book-2" },
      body: { title: "Updated Title" },
    });
    const response = createMockResponse();

    await bookByIdHandler(request, response as unknown as HandlerResponse);

    expect(updateBook).toHaveBeenCalledWith("user-1", "book-2", {
      title: "Updated Title",
    });
    expect(response.statusCode).toBe(404);
    expect(response.jsonBody).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Book not found.",
        details: undefined,
      },
    });
  });

  it("updates a book owned by the authenticated user", async () => {
    const updatedBook = {
      ...sampleBook,
      title: "Updated Title",
      updatedAt: "2026-03-19T13:00:00.000Z",
    };
    (validateUpdateBookPayload as jest.Mock).mockReturnValue({
      title: "Updated Title",
    });
    (updateBook as jest.Mock).mockResolvedValue(updatedBook);

    const request = createRequest({
      method: "PUT",
      query: { id: "book-1" },
      body: { title: "Updated Title" },
    });
    const response = createMockResponse();

    await bookByIdHandler(request, response as unknown as HandlerResponse);

    expect(validateUpdateBookPayload).toHaveBeenCalledWith({
      title: "Updated Title",
    });
    expect(updateBook).toHaveBeenCalledWith("user-1", "book-1", {
      title: "Updated Title",
    });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual(updatedBook);
  });

  it("returns 404 when deleting a book not owned by the authenticated user", async () => {
    (deleteBook as jest.Mock).mockResolvedValue(false);

    const request = createRequest({
      method: "DELETE",
      query: { id: "book-2" },
    });
    const response = createMockResponse();

    await bookByIdHandler(request, response as unknown as HandlerResponse);

    expect(deleteBook).toHaveBeenCalledWith("user-1", "book-2");
    expect(response.statusCode).toBe(404);
    expect(response.jsonBody).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Book not found.",
        details: undefined,
      },
    });
  });

  it("deletes a book owned by the authenticated user", async () => {
    (deleteBook as jest.Mock).mockResolvedValue(true);

    const request = createRequest({
      method: "DELETE",
      query: { id: "book-1" },
    });
    const response = createMockResponse();

    await bookByIdHandler(request, response as unknown as HandlerResponse);

    expect(deleteBook).toHaveBeenCalledWith("user-1", "book-1");
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual({ success: true });
  });
});
