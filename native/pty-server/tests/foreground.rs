//! Resolution observes the same request cwd/PATH; it is not an artifact hash verifier.
#[cfg(target_os = "linux")]
mod linux {
    use huhu_pty::foreground::{self, Rejection};
    use serde_json::{json, Value};
    use std::{
        collections::HashMap,
        fs,
        os::unix::fs::{MetadataExt, PermissionsExt},
        path::Path,
    };
    fn identity(path: &Path) -> Value {
        let path = fs::canonicalize(path).unwrap();
        let m = fs::metadata(&path).unwrap();
        json!({"path":path,"dev":m.dev().to_string(),"ino":m.ino().to_string()})
    }
    #[test]
    fn physical_resolution_uses_request_cwd_and_refuses_changed_entry_or_path() {
        let root = std::env::temp_dir().join(format!("huhu-fg-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&root).unwrap();
        let result = std::panic::catch_unwind(|| {
            let entry = root.join("entry");
            fs::write(&entry, b"#!/usr/bin/env node\n").unwrap();
            fs::set_permissions(&entry, fs::Permissions::from_mode(0o700)).unwrap();
            fs::create_dir(root.join("bin")).unwrap();
            std::os::unix::fs::symlink("/bin/true", root.join("bin/node")).unwrap();
            std::os::unix::fs::symlink("entry", root.join("pi")).unwrap();
            let recipe =
                json!({"executable":identity(Path::new("/bin/true")),"entry":identity(&entry)});
            let env = HashMap::from([(
                "PATH".into(),
                root.join("bin").to_string_lossy().into_owned(),
            )]);
            for (file, args) in [("node", vec!["entry".into()]), ("./pi", vec![])] {
                assert!(
                    foreground::validate_launch(file, &args, root.to_str(), &env, &recipe).is_ok()
                );
            }
            assert!(matches!(
                foreground::validate_launch("node", &["entry".into()], Some("/"), &env, &recipe),
                Err(Rejection::RecipeChanged)
            ));
            fs::remove_file(root.join("bin/node")).unwrap();
            std::os::unix::fs::symlink("/bin/false", root.join("bin/node")).unwrap();
            assert!(matches!(
                foreground::validate_launch(
                    "node",
                    &["entry".into()],
                    root.to_str(),
                    &env,
                    &recipe
                ),
                Err(Rejection::RecipeChanged)
            ));
            fs::rename(&entry, root.join("old-entry")).unwrap();
            fs::write(&entry, b"#!/usr/bin/env node\n").unwrap();
            assert!(matches!(
                foreground::validate_launch("./pi", &[], root.to_str(), &env, &recipe),
                Err(Rejection::RecipeChanged)
            ));
        });
        fs::remove_dir_all(&root).unwrap();
        if let Err(e) = result {
            std::panic::resume_unwind(e);
        }
    }
}
#[test]
fn positive_foreground_capability_is_platform_specific() {
    assert_eq!(huhu_pty::foreground::supported(), cfg!(target_os = "linux"));
}
