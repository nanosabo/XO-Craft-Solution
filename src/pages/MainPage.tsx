import { yupResolver } from "@hookform/resolvers/yup";
import ColumnInputs from "@src/containers/ColumnInputs";
import MainPageHeader from "@src/containers/Headers";
import UpdateModal from "@src/containers/UpdateModal";
import { VehicleFormData, vehicleSchema } from "@src/helpers/validation";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { useAppSelector } from "@src/store/store";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
  const { status } = useAppSelector(selectAppState);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === AppStateStatus.INITIAL) navigate("/loading");
  }, [navigate, status]);

  const methods = useForm<VehicleFormData>({
    resolver: yupResolver(vehicleSchema),
  });

  return (
    <AnimatePageLayout>
      <FormProvider {...methods}>
        <MainPageHeader />
        <ColumnInputs />
      </FormProvider>
      <UpdateModal />
    </AnimatePageLayout>
  );
};

export default MainPage;
