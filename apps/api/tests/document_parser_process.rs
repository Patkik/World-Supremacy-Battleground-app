#![cfg(feature = "firestore")]

use lopdf::{dictionary, Document, Object};
use std::io::Write;
use std::process::{Command, Stdio};

fn sample_pdf() -> Vec<u8> {
    let mut document = Document::with_version("1.4");
    let pages = document.new_object_id();
    let page = document.add_object(dictionary! {
        "Type" => "Page", "Parent" => pages,
        "MediaBox" => vec![0.into(), 0.into(), 200.into(), 200.into()]
    });
    document.objects.insert(
        pages,
        Object::Dictionary(dictionary! {
            "Type" => "Pages", "Kids" => vec![Object::Reference(page)], "Count" => 1
        }),
    );
    let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages });
    document.trailer.set("Root", catalog);
    let mut bytes = Vec::new();
    document.save_to(&mut bytes).unwrap();
    bytes
}

fn run_parser(content_type: &str, bytes: &[u8]) -> std::process::ExitStatus {
    let mut child = Command::new(env!("CARGO_BIN_EXE_wsb-api"))
        .arg("--document-parser")
        .arg(content_type)
        .env_clear()
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    child.stdin.take().unwrap().write_all(bytes).unwrap();
    child.wait().unwrap()
}

#[test]
fn isolated_worker_accepts_a_structurally_valid_pdf() {
    let status = run_parser("application/pdf", &sample_pdf());
    assert_eq!(status.code(), Some(0));
}

#[test]
fn isolated_worker_rejects_invalid_and_oversized_input() {
    let invalid = run_parser("application/pdf", b"%PDF-1.4\nSynthetic document\n%%EOF\n");
    assert_eq!(invalid.code(), Some(2));

    let oversized = vec![0; 10 * 1024 * 1024 + 1];
    let oversized = run_parser("application/pdf", &oversized);
    assert_eq!(oversized.code(), Some(3));
}

#[test]
fn isolated_worker_decodes_a_synthetic_png() {
    let mut png = std::io::Cursor::new(Vec::new());
    image::DynamicImage::new_rgb8(2, 2)
        .write_to(&mut png, image::ImageFormat::Png)
        .unwrap();
    let status = run_parser("image/png", png.get_ref());
    assert_eq!(status.code(), Some(0));
}
