import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CircleAlert, Home, RotateCw } from 'lucide-react';
import { Button, buttonStyles } from '../ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndGoHome = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.hash = '#/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 text-fg"
        >
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-danger-line bg-surface p-6 text-center shadow-pop sm:p-8">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft text-danger-fg">
              <CircleAlert className="size-6" aria-hidden />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-fg">Đã xảy ra sự cố hiển thị</h1>
              <p className="text-sm leading-relaxed text-muted">
                Ứng dụng gặp lỗi bất ngờ khi hiển thị nội dung này. Vui lòng tải lại trang để tiếp
                tục.
              </p>
              {this.state.errorMessage && (
                <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-muted break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button
                variant="primary"
                leftIcon={<RotateCw className="size-4" aria-hidden />}
                onClick={this.handleReload}
              >
                Tải lại trang
              </Button>
              <a
                href="#/"
                onClick={this.handleResetAndGoHome}
                className={buttonStyles({ variant: 'secondary' })}
              >
                <Home className="size-4" aria-hidden />
                Trang chủ
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
