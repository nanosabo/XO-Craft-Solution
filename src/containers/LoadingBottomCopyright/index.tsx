import styles from "./styles/LoadingBottomCopyright.module.scss";

const LoadingBottomCopyright = () => {
  return (
    <div className={styles.loading_bottom_copyright}>
      <p>
        &copy; {new Date().getFullYear()} Crossout Craft Sollution. Author
        SABOTAGE
      </p>
      <span>
        The project is not an official product of Gaijin Entertainment or Targem
        Games. All content used belongs to their respective owners and is not
        affiliated with or endorsed by Gaijin Entertainment or Targem Games.
      </span>
    </div>
  );
};

export default LoadingBottomCopyright;
