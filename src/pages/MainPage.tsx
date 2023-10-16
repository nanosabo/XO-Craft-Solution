import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { useAppSelector } from "@src/store/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
  const { status } = useAppSelector(selectAppState);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === AppStateStatus.INITIAL) navigate("/loading");
  }, [navigate, status]);

  return <div>Main Page</div>;
};

export default MainPage;
