package com.resume.ats.controller;

import com.resume.ats.model.Applicant;
import com.resume.ats.model.Job;
import com.resume.ats.repository.ApplicantRepository;
import com.resume.ats.repository.JobRepository;
import com.resume.ats.service.ResumeParserService;
import com.resume.ats.service.ScreeningService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/applicants")
@CrossOrigin(origins = "*")
public class ApplicantController {

    @Autowired
    private ApplicantRepository applicantRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ResumeParserService resumeParserService;

    @Autowired
    private ScreeningService screeningService;

    @GetMapping
    public List<Applicant> getAllApplicants() {
        return applicantRepository.findAll();
    }

    @GetMapping("/job/{jobId}")
    public List<Applicant> getApplicantsByJob(@PathVariable Long jobId) {
        return applicantRepository.findByJobId(jobId);
    }

    @PostMapping("/screen")
    public ResponseEntity<?> screenCandidate(
            @RequestParam("file") MultipartFile file,
            @RequestParam("jobId") Long jobId) {
        try {
            // Find job details
            Optional<Job> jobOpt = jobRepository.findById(jobId);
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Job not found with ID: " + jobId));
            }
            Job job = jobOpt.get();

            // Parse file to text
            String resumeText = resumeParserService.parseResume(file);

            // Screen resume against job
            Applicant applicant = screeningService.screenResume(
                    resumeText,
                    job.getDescription(),
                    job.getRequirements(),
                    job.getTitle(),
                    job.getId(),
                    file.getOriginalFilename()
            );

            // Save applicant to DB
            Applicant savedApplicant = applicantRepository.save(applicant);
            return ResponseEntity.ok(savedApplicant);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while screening the resume: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String newStatus = request.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Status cannot be empty"));
        }

        Optional<Applicant> applicantOpt = applicantRepository.findById(id);
        if (applicantOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Applicant applicant = applicantOpt.get();
        applicant.setStatus(newStatus.toUpperCase().trim());
        Applicant updated = applicantRepository.save(applicant);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplicant(@PathVariable Long id) {
        if (applicantRepository.existsById(id)) {
            applicantRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        List<Applicant> applicants = applicantRepository.findAll();
        long totalJobs = jobRepository.count();

        long totalApplicants = applicants.size();
        double averageScore = applicants.stream()
                .mapToDouble(Applicant::getScore)
                .average()
                .orElse(0.0);

        // Round average score to one decimal place
        averageScore = Math.round(averageScore * 10.0) / 10.0;

        long appliedCount = 0;
        long screeningCount = 0;
        long interviewCount = 0;
        long offeredCount = 0;
        long rejectedCount = 0;

        for (Applicant app : applicants) {
            String status = app.getStatus();
            if (status == null) continue;
            switch (status) {
                case "APPLIED" -> appliedCount++;
                case "SCREENING" -> screeningCount++;
                case "INTERVIEW" -> interviewCount++;
                case "OFFERED" -> offeredCount++;
                case "REJECTED" -> rejectedCount++;
                default -> appliedCount++;
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalApplicants", totalApplicants);
        stats.put("averageScore", averageScore);
        stats.put("jobCount", totalJobs);
        stats.put("applied", appliedCount);
        stats.put("screening", screeningCount);
        stats.put("interview", interviewCount);
        stats.put("offered", offeredCount);
        stats.put("rejected", rejectedCount);

        return stats;
    }
}
