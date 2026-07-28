package com.resume.ats.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "applicants")
public class Applicant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    private String phone;
    private String resumeFileName;
    private String status; // APPLIED, SCREENING, INTERVIEW, OFFERED, REJECTED
    private int score; // 0 to 100

    @Lob
    @Column(columnDefinition = "CLOB")
    private String matchedSkills; // Comma-separated or JSON list

    @Lob
    @Column(columnDefinition = "CLOB")
    private String missingSkills; // Comma-separated or JSON list

    @Lob
    @Column(columnDefinition = "CLOB")
    private String feedback; // Actionable feedback

    private Long jobId;
    private String jobTitle;
    private LocalDate appliedDate;

    // Constructors
    public Applicant() {
        this.status = "APPLIED";
        this.appliedDate = LocalDate.now();
    }

    public Applicant(String name, String email, String phone, String resumeFileName, String status, int score,
                     String matchedSkills, String missingSkills, String feedback, Long jobId, String jobTitle) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.resumeFileName = resumeFileName;
        this.status = status != null ? status : "APPLIED";
        this.score = score;
        this.matchedSkills = matchedSkills;
        this.missingSkills = missingSkills;
        this.feedback = feedback;
        this.jobId = jobId;
        this.jobTitle = jobTitle;
        this.appliedDate = LocalDate.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getResumeFileName() {
        return resumeFileName;
    }

    public void setResumeFileName(String resumeFileName) {
        this.resumeFileName = resumeFileName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getMatchedSkills() {
        return matchedSkills;
    }

    public void setMatchedSkills(String matchedSkills) {
        this.matchedSkills = matchedSkills;
    }

    public String getMissingSkills() {
        return missingSkills;
    }

    public void setMissingSkills(String missingSkills) {
        this.missingSkills = missingSkills;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(LocalDate appliedDate) {
        this.appliedDate = appliedDate;
    }
}
