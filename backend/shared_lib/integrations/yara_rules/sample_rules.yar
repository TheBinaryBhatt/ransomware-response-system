
rule Sample_Ransomware {
    meta:
        description = "Sample ransomware-related indicators"
        severity = "High"
    strings:
        $s1 = "ransom" nocase
        $s2 = "encrypt" nocase
        $s3 = "decrypt" nocase
    condition:
        any of them
}
