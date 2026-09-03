import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiFailure = {
  success: false;
  message: string;
  code: string;
};

export function apiSuccess<T>(
  data: T,
  message = "Request completed successfully",
  status = 200,
) {
  return NextResponse.json(
    { success: true, message, data } satisfies ApiSuccess<T>,
    { status },
  );
}

export function apiError(
  message: string,
  code = "REQUEST_FAILED",
  status = 400,
) {
  return NextResponse.json(
    { success: false, message, code } satisfies ApiFailure,
    { status },
  );
}
