import LoadingBottomCopyright from "@src/containers/LoadingBottomCopyright";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
import LoadingLayout from "@src/layouts/LoadingLayout";

const LoadingPage = () => {
  return (
    <LoadingLayout>
      <LoadingLogoSection />
      <LoadingBottomCopyright />
    </LoadingLayout>
  );
};

export default LoadingPage;
