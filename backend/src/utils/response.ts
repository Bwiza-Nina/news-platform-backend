import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  message: string,
  data: object | null = null,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    Success: true,
    Message: message,
    Object: data,
    Errors: null,
  });
};

export const sendError = (
  res: Response,
  message: string,
  errors: string[] | null = null,
  statusCode = 400
) => {
  return res.status(statusCode).json({
    Success: false,
    Message: message,
    Object: null,
    Errors: errors,
  });
};

export const sendPaginated = (
  res: Response,
  message: string,
  data: object[],
  page: number,
  size: number,
  total: number
) => {
  return res.status(200).json({
    Success: true,
    Message: message,
    Object: data,
    PageNumber: page,
    PageSize: size,
    TotalSize: total,
    Errors: null,
  });
};