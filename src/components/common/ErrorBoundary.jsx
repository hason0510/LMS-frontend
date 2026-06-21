import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Lỗi giao diện chưa được xử lý:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/login");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background-light px-6 text-center dark:bg-background-dark">
          <h1 className="text-2xl font-bold text-[#111418] dark:text-white">
            Đã xảy ra lỗi hiển thị
          </h1>
          <p className="max-w-md text-base text-[#617589] dark:text-gray-400">
            Giao diện gặp sự cố ngoài ý muốn. Vui lòng tải lại trang hoặc đăng nhập lại.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="h-11 rounded-lg bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Về trang đăng nhập
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
