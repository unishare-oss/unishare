import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { McpExceptionFilter } from './mcp-exception.filter'

describe('McpExceptionFilter', () => {
  let filter: McpExceptionFilter
  let mockResponse: {
    status: jest.Mock
    json: jest.Mock
    headersSent: boolean
  }
  let mockHost: ArgumentsHost

  beforeEach(() => {
    filter = new McpExceptionFilter()
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    }
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost
  })

  it('should handle BadRequestException with JSON-RPC error format (-32602)', () => {
    const exception = new BadRequestException('Invalid parameters')
    filter.catch(exception, mockHost)

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: 'Invalid parameters',
      },
      id: null,
    })
  })

  it('should handle NotFoundException with JSON-RPC error format (-32004)', () => {
    const exception = new NotFoundException('Board not found')
    filter.catch(exception, mockHost)

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32004,
        message: 'Board not found',
      },
      id: null,
    })
  })

  it('should handle UnauthorizedException / ForbiddenException with JSON-RPC error format (-32000)', () => {
    const exception = new UnauthorizedException('Authentication required')
    filter.catch(exception, mockHost)

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required',
      },
      id: null,
    })

    const forbiddenException = new ForbiddenException('Missing scope')
    filter.catch(forbiddenException, mockHost)

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Missing scope',
      },
      id: null,
    })
  })

  it('should handle generic Error with JSON-RPC internal error format (-32603)', () => {
    const exception = new Error('Something went wrong')
    filter.catch(exception, mockHost)

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Something went wrong',
      },
      id: null,
    })
  })

  it('should not respond if headers have already been sent', () => {
    mockResponse.headersSent = true
    const exception = new NotFoundException('Not found')

    filter.catch(exception, mockHost)

    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })
})
