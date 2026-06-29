import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess } from '@cms/shared-types';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccess<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in (data as object)
        ) {
          // FIX: cast qua unknown trước vì TS không thể verify shape lúc compile-time
          return data as unknown as ApiSuccess<T>;
        }

        return { success: true, data } satisfies ApiSuccess<T>;
      }),
    );
  }
}