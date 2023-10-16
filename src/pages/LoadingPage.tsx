import LoadingBottomCopyright from "@src/containers/LoadingBottomCopyright";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
import useLoaderStatus from "@src/hooks/useLoaderStatus";
import LoadingLayout from "@src/layouts/LoadingLayout";

const LoadingPage = () => {
  const { isError, isInitial, status } = useLoaderStatus();

  return (
    <LoadingLayout>
      <LoadingLogoSection
        isInitialStatus={isInitial}
        isErrorStatus={isError}
        status={status}
      />

      {isInitial && <LoadingBottomCopyright />}
    </LoadingLayout>
  );
};

export default LoadingPage;
